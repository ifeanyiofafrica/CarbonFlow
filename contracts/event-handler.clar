;; EventHandler Contract
;; Clarity v2
;; Logs events for CarbonFlow platform's NFT and marketplace activities
;; Implements event emission and admin management

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ZERO-ADDRESS u103)

;; Contract metadata
(define-constant CONTRACT-NAME "EventHandler")

;; Data variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)

;; Data maps
(define-map events uint { 
  token-id: uint, 
  actor: principal, 
  price: uint, 
  nft-contract: principal, 
  is-cancelled: bool, 
  timestamp: uint 
})

;; Counter for event IDs
(define-data-var event-id-counter uint u0)

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

;; Emit event
(define-public (emit-event (token-id uint) (actor principal) (price uint) (nft-contract principal) (is-cancelled bool))
  (begin
    (asserts! (not (var-get paused)) (err ERR-NOT-AUTHORIZED))
    (let
      (
        (event-id (var-get event-id-counter))
        (new-event-id (+ event-id u1))
      )
      (map-set events event-id { 
        token-id: token-id, 
        actor: actor, 
        price: price, 
        nft-contract: nft-contract, 
        is-cancelled: is-cancelled, 
        timestamp: block-height 
      })
      (var-set event-id-counter new-event-id)
      (ok true)
    )
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

;; Read-only: get event details
(define-read-only (get-event (event-id uint))
  (match (map-get? events event-id)
    event (ok event)
    (err u101)
  )
)

;; Read-only: get event counter
(define-read-only (get-event-counter)
  (ok (var-get event-id-counter))
)