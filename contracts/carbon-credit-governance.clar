;; CarbonCreditGovernance Contract
;; Clarity v2
;; Manages governance proposals and voting for the CarbonFlow platform
;; Implements proposal creation, voting, and execution

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ZERO-ADDRESS u101)
(define-constant ERR-PAUSED u102)
(define-constant ERR-INVALID-AMOUNT u103)
(define-constant ERR-PROPOSAL-NOT-FOUND u104)
(define-constant ERR-ALREADY-VOTED u105)
(define-constant ERR-VOTING-CLOSED u106)
(define-constant ERR-PROPOSAL-EXECUTED u107)
(define-constant ERR-PROPOSAL-NOT-APPROVED u108)
(define-constant ERR-INVALID-DURATION u109)

;; Contract metadata
(define-constant CONTRACT-NAME "CarbonCreditGovernance")
(define-constant MIN_VOTING_DURATION u1440) ;; ~1 day in blocks
(define-constant MAX_VOTING_DURATION u525600) ;; ~1 year in blocks

;; Data variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var min-proposal-amount uint u1000000) ;; 1 STX in micro-STX
(define-data-var proposal-count uint u0)

;; Data maps
(define-map proposals 
  uint 
  { 
    proposer: principal, 
    description: (string-ascii 256), 
    amount: uint, 
    recipient: principal, 
    start-block: uint, 
    duration: uint, 
    yes-votes: uint, 
    no-votes: uint, 
    executed: bool 
  }
)
(define-map votes 
  { proposal-id: uint, voter: principal } 
  bool
)

;; Set admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Set minimum proposal amount
(define-public (set-min-proposal-amount (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (var-set min-proposal-amount amount)
    (ok true)
  )
)

;; Create proposal
(define-public (create-proposal (description (string-ascii 256)) (amount uint) (recipient principal) (duration uint))
  (begin
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (>= amount (var-get min-proposal-amount)) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (and (>= duration MIN_VOTING_DURATION) (<= duration MAX_VOTING_DURATION)) (err ERR-INVALID-DURATION))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (let
      (
        (proposal-id (var-get proposal-count))
      )
      (map-set proposals 
        proposal-id
        { 
          proposer: tx-sender, 
          description: description, 
          amount: amount, 
          recipient: recipient, 
          start-block: block-height, 
          duration: duration, 
          yes-votes: u0, 
          no-votes: u0, 
          executed: false 
        }
      )
      (var-set proposal-count (+ proposal-id u1))
      (ok proposal-id)
    )
  )
)

;; Vote on proposal
(define-public (vote (proposal-id uint) (vote-yes bool))
  (begin
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (match (map-get? proposals proposal-id)
      proposal
      (begin
        (asserts! (<= block-height (+ (get start-block proposal) (get duration proposal))) (err ERR-VOTING-CLOSED))
        (asserts! (not (get executed proposal)) (err ERR-PROPOSAL-EXECUTED))
        (asserts! (is-none (map-get? votes { proposal-id: proposal-id, voter: tx-sender })) (err ERR-ALREADY-VOTED))
        (map-set votes { proposal-id: proposal-id, voter: tx-sender } vote-yes)
        (map-set proposals 
          proposal-id
          (merge proposal 
            { 
              yes-votes: (if vote-yes (+ (get yes-votes proposal) u1) (get yes-votes proposal)),
              no-votes: (if vote-yes (get no-votes proposal) (+ (get no-votes proposal) u1))
            }
          )
        )
        (ok true)
      )
      (err ERR-PROPOSAL-NOT-FOUND)
    )
  )
)

;; Execute proposal
(define-public (execute-proposal (proposal-id uint))
  (begin
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (match (map-get? proposals proposal-id)
      proposal
      (begin
        (asserts! (> block-height (+ (get start-block proposal) (get duration proposal))) (err ERR-VOTING-CLOSED))
        (asserts! (not (get executed proposal)) (err ERR-PROPOSAL-EXECUTED))
        (asserts! (> (get yes-votes proposal) (get no-votes proposal)) (err ERR-PROPOSAL-NOT-APPROVED))
        (map-set proposals proposal-id (merge proposal { executed: true }))
        (try! (as-contract (stx-transfer? (get amount proposal) (as-contract tx-sender) (get recipient proposal))))
        (ok true)
      )
      (err ERR-PROPOSAL-NOT-FOUND)
    )
  )
)

;; Read-only: get proposal details
(define-read-only (get-proposal (proposal-id uint))
  (match (map-get? proposals proposal-id)
    proposal (ok proposal)
    (err ERR-PROPOSAL-NOT-FOUND)
  )
)

;; Read-only: get vote
(define-read-only (get-vote (proposal-id uint) (voter principal))
  (match (map-get? votes { proposal-id: proposal-id, voter: voter })
    vote (ok vote)
    (err ERR-ALREADY-VOTED)
  )
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get min proposal amount
(define-read-only (get-min-proposal-amount)
  (ok (var-get min-proposal-amount))
)

;; Read-only: get proposal count
(define-read-only (get-proposal-count)
  (ok (var-get proposal-count))
)