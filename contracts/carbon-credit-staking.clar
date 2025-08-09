;; CarbonCreditStaking Contract
;; Clarity v2
;; Allows staking of carbon credit NFTs for rewards in STX tokens
;; Implements staking, unstaking, reward distribution, and admin controls

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NFT-NOT-OWNED u101)
(define-constant ERR-ALREADY-STAKED u102)
(define-constant ERR-ZERO-ADDRESS u103)
(define-constant ERR-INVALID-AMOUNT u104)
(define-constant ERR-PAUSED u105)
(define-constant ERR-NFT-NOT-STAKED u106)
(define-constant ERR-INSUFFICIENT-BALANCE u107)
(define-constant ERR-INVALID-DURATION u108)
(define-constant ERR-NFT-CONTRACT-NOT-APPROVED u109)

;; Contract metadata
(define-constant CONTRACT-NAME "CarbonCreditStaking")
(define-constant STX-DECIMALS u6)

;; Data variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var reward-rate uint u100) ;; 1% per block (in basis points)
(define-data-var reward-fund uint u0)
(define-data-var min-stake-duration uint u1440) ;; ~1 day in blocks
(define-data-var max-stake-duration uint u525600) ;; ~1 year in blocks

;; Data maps
(define-map stakes 
  { user: principal, token-id: uint, nft-contract: principal }
  { start-block: uint, duration: uint }
)
(define-map approved-nft-contracts principal bool)
(define-map rewards { user: principal, token-id: uint, nft-contract: principal } uint)

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

;; Set reward rate
(define-public (set-reward-rate (rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> rate u0) (err ERR-INVALID-AMOUNT))
    (asserts! (<= rate u10000) (err ERR-INVALID-AMOUNT))
    (var-set reward-rate rate)
    (ok true)
  )
)

;; Fund reward pool
(define-public (fund-reward-pool (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (var-set reward-fund (+ (var-get reward-fund) amount))
    (ok true)
  )
)

;; Approve NFT contract
(define-public (approve-nft-contract (nft-contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq nft-contract 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (map-set approved-nft-contracts nft-contract true)
    (ok true)
  )
)

;; Set minimum stake duration
(define-public (set-min-stake-duration (duration uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> duration u0) (err ERR-INVALID-DURATION))
    (asserts! (<= duration (var-get max-stake-duration)) (err ERR-INVALID-DURATION))
    (var-set min-stake-duration duration)
    (ok true)
  )
)

;; Set maximum stake duration
(define-public (set-max-stake-duration (duration uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= duration (var-get min-stake-duration)) (err ERR-INVALID-DURATION))
    (var-set max-stake-duration duration)
    (ok true)
  )
)

;; Stake NFT
(define-public (stake-nft (token-id uint) (nft-contract principal) (duration uint))
  (begin
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (map-get? approved-nft-contracts nft-contract) (err ERR-NFT-CONTRACT-NOT-APPROVED))
    (asserts! (is-eq (unwrap! (contract-call? nft-contract get-owner token-id) (err ERR-NFT-NOT-OWNED)) tx-sender) (err ERR-NFT-NOT-OWNED))
    (asserts! (is-none (map-get? stakes { user: tx-sender, token-id: token-id, nft-contract: nft-contract })) (err ERR-ALREADY-STAKED))
    (asserts! (and (>= duration (var-get min-stake-duration)) (<= duration (var-get max-stake-duration))) (err ERR-INVALID-DURATION))
    (try! (contract-call? nft-contract transfer token-id tx-sender (as-contract tx-sender)))
    (map-set stakes 
      { user: tx-sender, token-id: token-id, nft-contract: nft-contract }
      { start-block: block-height, duration: duration }
    )
    (ok true)
  )
)

;; Unstake NFT and claim rewards
(define-public (unstake-nft (token-id uint) (nft-contract principal))
  (begin
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (match (map-get? stakes { user: tx-sender, token-id: token-id, nft-contract: nft-contract })
      stake
      (begin
        (let
          (
            (start-block (get start-block stake))
            (duration (get duration stake))
            (blocks-staked (- block-height start-block))
            (reward-amount (/ (* blocks-staked (var-get reward-rate)) u10000))
          )
          (asserts! (>= blocks-staked duration) (err ERR-INVALID-DURATION))
          (asserts! (<= reward-amount (var-get reward-fund)) (err ERR-INSUFFICIENT-BALANCE))
          (map-delete stakes { user: tx-sender, token-id: token-id, nft-contract: nft-contract })
          (map-set rewards { user: tx-sender, token-id: token-id, nft-contract: nft-contract } reward-amount)
          (try! (as-contract (stx-transfer? reward-amount (as-contract tx-sender) tx-sender)))
          (try! (as-contract (contract-call? nft-contract transfer token-id (as-contract tx-sender) tx-sender)))
          (var-set reward-fund (- (var-get reward-fund) reward-amount))
          (ok true)
        )
      )
      (err ERR-NFT-NOT-STAKED)
    )
  )
)

;; Read-only: get stake details
(define-read-only (get-stake-details (user principal) (token-id uint) (nft-contract principal))
  (match (map-get? stakes { user: user, token-id: token-id, nft-contract: nft-contract })
    stake (ok stake)
    (err ERR-NFT-NOT-STAKED)
  )
)

;; Read-only: get reward amount
(define-read-only (get-reward-amount (user principal) (token-id uint) (nft-contract principal))
  (ok (default-to u0 (map-get? rewards { user: user, token-id: token-id, nft-contract: nft-contract })))
)

;; Read-only: get reward fund
(define-read-only (get-reward-fund)
  (ok (var-get reward-fund))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get reward rate
(define-read-only (get-reward-rate)
  (ok (var-get reward-rate))
)

;; Read-only: get min stake duration
(define-read-only (get-min-stake-duration)
  (ok (var-get min-stake-duration))
)

;; Read-only: get max stake duration
(define-read-only (get-max-stake-duration)
  (ok (var-get max-stake-duration))
)

;; Read-only: is NFT contract approved
(define-read-only (is-nft-contract-approved (nft-contract principal))
  (ok (default-to false (map-get? approved-nft-contracts nft-contract)))
)