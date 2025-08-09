;; CarbonCreditNFT Contract
;; Clarity v2
;; Manages tokenized carbon credits as NFTs for the CarbonFlow platform
;; Implements minting, retiring, transferring, and metadata management

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NFT-NOT-FOUND u101)
(define-constant ERR-ALREADY-RETIRED u102)
(define-constant ERR-ZERO-ADDRESS u103)
(define-constant ERR-INVALID-AMOUNT u104)
(define-constant ERR-INVALID-PROJECT-ID u105)
(define-constant ERR-NOT-VERIFIED u106)
(define-constant ERR-BATCH-LIMIT-EXCEEDED u107)

;; Contract metadata
(define-constant CONTRACT-NAME "CarbonCreditNFT")
(define-constant CONTRACT-SYMBOL "CCNFT")
(define-constant MAX-BATCH-MINT u10) ;; Limit batch minting to 10 NFTs per transaction

;; Data variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var token-id-counter uint u0)
(define-data-var auditor principal tx-sender) ;; Auditor for project verification

;; Data maps
(define-map carbon-credits uint { co2-tons: uint, project-id: (string-ascii 64), issuer: principal, is-retired: bool, verified: bool })
(define-map token-owners uint principal)
(define-map project-verifications (string-ascii 64) { verified: bool, auditor: principal })

;; Events for transparency
(define-trait event-trait
  ((emit-event (uint principal (string-ascii 64) uint bool) (response bool uint)))
)

(define-data-var event-handler (optional principal) none)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: is-auditor
(define-private (is-auditor)
  (is-eq tx-sender (var-get auditor))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate project ID
(define-private (validate-project-id (project-id (string-ascii 64)))
  (asserts! (> (len project-id) u0) (err ERR-INVALID-PROJECT-ID))
)

;; Private helper: check project verification
(define-private (is-project-verified (project-id (string-ascii 64)))
  (match (map-get? project-verifications project-id)
    details (get verified details)
    false
  )
)

;; Set event handler contract
(define-public (set-event-handler (handler principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set event-handler (some handler))
    (ok true)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set auditor
(define-public (set-auditor (new-auditor principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-auditor 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set auditor new-auditor)
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Verify a project
(define-public (verify-project (project-id (string-ascii 64)))
  (begin
    (asserts! (is-auditor) (err ERR-NOT-AUTHORIZED))
    (validate-project-id project-id)
    (map-set project-verifications project-id { verified: true, auditor: tx-sender })
    (ok true)
  )
)

;; Mint a single carbon credit NFT
(define-public (mint (recipient principal) (co2-tons uint) (project-id (string-ascii 64)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> co2-tons u0) (err ERR-INVALID-AMOUNT))
    (validate-project-id project-id)
    (asserts! (is-project-verified project-id) (err ERR-NOT-VERIFIED))
    (ensure-not-paused)
    (let ((token-id (+ (var-get token-id-counter) u1)))
      (map-set carbon-credits token-id
        { co2-tons: co2-tons, project-id: project-id, issuer: tx-sender, is-retired: false, verified: true })
      (map-set token-owners token-id recipient)
      (var-set token-id-counter token-id)
      (try! (emit-event token-id recipient project-id co2-tons false))
      (ok token-id)
    )
  )
)

;; Batch mint carbon credit NFTs
(define-public (batch-mint (recipients (list 10 principal)) (co2-tons-list (list 10 uint)) (project-id (string-ascii 64)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= (len recipients) MAX-BATCH-MINT) (err ERR-BATCH-LIMIT-EXCEEDED))
    (asserts! (is-eq (len recipients) (len co2-tons-list)) (err ERR-INVALID-AMOUNT))
    (validate-project-id project-id)
    (asserts! (is-project-verified project-id) (err ERR-NOT-VERIFIED))
    (ensure-not-paused)
    (fold batch-mint-iter (zip recipients co2-tons-list) (ok (var-get token-id-counter)))
  )
)

;; Private helper for batch minting
(define-private (batch-mint-iter (entry { recipient: principal, co2-tons: uint }) (prev-result (response uint uint)))
  (match prev-result
    current-id
    (begin
      (asserts! (not (is-eq (get recipient entry) 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
      (asserts! (> (get co2-tons entry) u0) (err ERR-INVALID-AMOUNT))
      (let ((token-id (+ current-id u1)))
        (map-set carbon-credits token-id
          { co2-tons: (get co2-tons entry), project-id: (get project-id (map-get? carbon-credits current-id)), issuer: tx-sender, is-retired: false, verified: true })
        (map-set token-owners token-id (get recipient entry))
        (var-set token-id-counter token-id)
        (try! (emit-event token-id (get recipient entry) (get project-id (map-get? carbon-credits current-id)) (get co2-tons entry) false))
        (ok token-id)
      )
    )
    err-val (err err-val)
  )
)

;; Transfer carbon credit NFT
(define-public (transfer (token-id uint) (recipient principal))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender (map-get? token-owners token-id)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (match (map-get? carbon-credits token-id)
      credit
      (begin
        (asserts! (not (get is-retired credit)) (err ERR-ALREADY-RETIRED))
        (map-set token-owners token-id recipient)
        (try! (emit-event token-id recipient (get project-id credit) (get co2-tons credit) false))
        (ok true)
      )
      (err ERR-NFT-NOT-FOUND)
    )
  )
)

;; Retire carbon credit NFT
(define-public (retire (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender (map-get? token-owners token-id)) (err ERR-NOT-AUTHORIZED))
    (match (map-get? carbon-credits token-id)
      credit
      (begin
        (asserts! (not (get is-retired credit)) (err ERR-ALREADY-RETIRED))
        (map-set carbon-credits token-id
          { co2-tons: (get co2-tons credit), project-id: (get project-id credit), issuer: (get issuer credit), is-retired: true, verified: (get verified credit) })
        (try! (emit-event token-id tx-sender (get project-id credit) (get co2-tons credit) true))
        (ok true)
      )
      (err ERR-NFT-NOT-FOUND)
    )
  )
)

;; Private: emit event to event handler
(define-private (emit-event (token-id uint) (owner principal) (project-id (string-ascii 64)) (co2-tons uint) (is-retired bool))
  (match (var-get event-handler)
    handler
    (contract-call? handler emit-event token-id owner project-id co2-tons is-retired)
    (ok true)
  )
)

;; Read-only: get credit details
(define-read-only (get-credit-details (token-id uint))
  (match (map-get? carbon-credits token-id)
    credit (ok credit)
    (err ERR-NFT-NOT-FOUND)
  )
)

;; Read-only: get owner
(define-read-only (get-owner (token-id uint))
  (match (map-get? token-owners token-id)
    owner (ok owner)
    (err ERR-NFT-NOT-FOUND)
  )
)

;; Read-only: get total minted
(define-read-only (get-total-minted)
  (ok (var-get token-id-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: get auditor
(define-read-only (get-auditor)
  (ok (var-get auditor))
)

;; Read-only: is paused delegations
(define-read-only (is-paused)
  (ok (var-get paused))
)