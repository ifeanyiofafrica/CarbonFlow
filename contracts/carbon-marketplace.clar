;; CarbonMarketplace Contract
;; Clarity v2
;; Manages trading of carbon credit NFTs for the CarbonFlow platform
;; Implements listing, buying, cancelling listings, and fee management

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-LISTING-NOT-FOUND u101)
(define-constant ERR-ALREADY-LISTED u102)
(define-constant ERR-ZERO-ADDRESS u103)
(define-constant ERR-INVALID-PRICE u104)
(define-constant ERR-INVALID-FEE u105)
(define-constant ERR-PAUSED u106)
(define-constant ERR-INSUFFICIENT-BALANCE u107)
(define-constant ERR-NFT-NOT-OWNED u108)

;; Contract metadata
(define-constant CONTRACT-NAME "CarbonMarketplace")
(define-constant MAX-FEE-PERCENT u10000) ;; 100% in basis points
(define-constant STX-DECIMALS u6)

;; Data variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var marketplace-fee uint u500) ;; 5% fee in basis points
(define-data-var fee-recipient principal tx-sender)

;; Data maps
(define-map listings uint { seller: principal, price: uint, nft-contract: principal })
(define-map carbon-credit-contract principal bool) ;; Approved NFT contracts

;; Events for transparency
(define-trait event-trait
  ((emit-event (uint principal uint principal bool) (response bool uint)))
)

(define-data-var event-handler (optional principal) none)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate price
(define-private (validate-price (price uint))
  (asserts! (> price u0) (err ERR-INVALID-PRICE))
)

;; Private helper: check NFT ownership
(define-private (check-nft-ownership (nft-contract principal) (token-id uint) (owner principal))
  (match (contract-call? nft-contract get-owner token-id)
    owner-result (is-eq owner-result owner)
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

;; Set marketplace fee
(define-public (set-marketplace-fee (fee uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= fee MAX-FEE-PERCENT) (err ERR-INVALID-FEE))
    (var-set marketplace-fee fee)
    (ok true)
  )
)

;; Set fee recipient
(define-public (set-fee-recipient (recipient principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set fee-recipient recipient)
    (ok true)
  )
)

;; Approve NFT contract
(define-public (approve-nft-contract (nft-contract principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq nft-contract 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (map-set carbon-credit-contract nft-contract true)
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

;; List NFT for sale
(define-public (list-nft (token-id uint) (nft-contract principal) (price uint))
  (begin
    (ensure-not-paused)
    (asserts! (map-get? carbon-credit-contract nft-contract) (err ERR-NOT-AUTHORIZED))
    (asserts! (check-nft-ownership nft-contract token-id tx-sender) (err ERR-NFT-NOT-OWNED))
    (validate-price price)
    (asserts! (is-none (map-get? listings token-id)) (err ERR-ALREADY-LISTED))
    (map-set listings token-id { seller: tx-sender, price: price, nft-contract: nft-contract })
    (try! (emit-event token-id tx-sender price nft-contract false))
    (ok true)
  )
)

;; Cancel NFT listing
(define-public (cancel-listing (token-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? listings token-id)
      listing
      (begin
        (asserts! (is-eq (get seller listing) tx-sender) (err ERR-NOT-AUTHORIZED))
        (map-delete listings token-id)
        (try! (emit-event token-id tx-sender (get price listing) (get nft-contract listing) true))
        (ok true)
      )
      (err ERR-LISTING-NOT-FOUND)
    )
  )
)

;; Buy NFT
(define-public (buy-nft (token-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? listings token-id)
      listing
      (begin
        (let
          (
            (seller (get seller listing))
            (price (get price listing))
            (nft-contract (get nft-contract listing))
            (fee-amount (/ (* price (var-get marketplace-fee)) u10000))
            (seller-amount (- price fee-amount))
          )
          (asserts! (not (is-eq tx-sender seller)) (err ERR-NOT-AUTHORIZED))
          (asserts! (>= (stx-get-balance tx-sender) price) (err ERR-INSUFFICIENT-BALANCE))
          (try! (stx-transfer? fee-amount tx-sender (var-get fee-recipient)))
          (try! (stx-transfer? seller-amount tx-sender seller))
          (try! (contract-call? nft-contract transfer token-id seller tx-sender))
          (map-delete listings token-id)
          (try! (emit-event token-id tx-sender price nft-contract false))
          (ok true)
        )
      )
      (err ERR-LISTING-NOT-FOUND)
    )
  )
)

;; Private: emit event to event handler
(define-private (emit-event (token-id uint) (actor principal) (price uint) (nft-contract principal) (is-cancelled bool))
  (match (var-get event-handler)
    handler
    (contract-call? handler emit-event token-id actor price nft-contract is-cancelled)
    (ok true)
  )
)

;; Read-only: get listing details
(define-read-only (get-listing (token-id uint))
  (match (map-get? listings token-id)
    listing (ok listing)
    (err ERR-LISTING-NOT-FOUND)
  )
)

;; Read-only: get marketplace fee
(define-read-only (get-marketplace-fee)
  (ok (var-get marketplace-fee))
)

;; Read-only: get fee recipient
(define-read-only (get-fee-recipient)
  (ok (var-get fee-recipient))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: is NFT contract approved
(define-read-only (is-nft-contract-approved (nft-contract principal))
  (ok (default-to false (map-get? carbon-credit-contract nft-contract)))
)