import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export default function StripePayment() {
    const navigate = useNavigate()
    const containerRef = useRef(null)
    const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SrRAMRsNEBjuuaS5kHXHXyqJBUR1TJhyX64FYWUGXCTDbrIsXyyIU3Rch6Uyx778OumNnetrYrJAeVqm9Pgrc9l00KCFXi2Kh'

    useEffect(() => {
        // Dynamically load the Google Pay script
        const script = document.createElement('script')
        script.src = 'https://pay.google.com/gp/p/js/pay.js'
        script.async = true
        script.onload = onGooglePayLoaded
        document.body.appendChild(script)

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
        }
    }, [])

    // --- Google Pay Configurations ---

    const baseRequest = {
        apiVersion: 2,
        apiVersionMinor: 0
    }

    const allowedCardNetworks = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"]
    const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"]

    const tokenizationSpecification = {
        type: 'PAYMENT_GATEWAY',
        parameters: {
            'gateway': 'stripe',
            'stripe:version': '2018-10-31',
            'stripe:publishableKey': STRIPE_PUBLISHABLE_KEY
        }
    }

    const baseCardPaymentMethod = {
        type: 'CARD',
        parameters: {
            allowedAuthMethods: allowedCardAuthMethods,
            allowedCardNetworks: allowedCardNetworks
        }
    }

    const cardPaymentMethod = Object.assign(
        {},
        baseCardPaymentMethod,
        {
            tokenizationSpecification: tokenizationSpecification
        }
    )

    let paymentsClient = null

    function getGoogleIsReadyToPayRequest() {
        return Object.assign(
            {},
            baseRequest,
            {
                allowedPaymentMethods: [baseCardPaymentMethod]
            }
        )
    }

    function getGooglePaymentDataRequest() {
        const paymentDataRequest = Object.assign({}, baseRequest)
        paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod]
        paymentDataRequest.transactionInfo = getGoogleTransactionInfo()
        paymentDataRequest.merchantInfo = {
            merchantId: 'BCR2DN5T33HMVABB', // You might need to update this with your real Merchant ID
            merchantName: 'DKSocial'
        }
        return paymentDataRequest
    }

    function getGooglePaymentsClient() {
        if (paymentsClient === null) {
            // 'TEST' environment is required for localhost and unverified merchants.
            // OR_BIBED_11 error occurs if using 'PRODUCTION' without a valid, approved Merchant ID.
            paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST' })
        }
        return paymentsClient
    }

    function onGooglePayLoaded() {
        const clients = getGooglePaymentsClient()
        clients.isReadyToPay(getGoogleIsReadyToPayRequest())
            .then(function (response) {
                if (response.result) {
                    addGooglePayButton()
                }
            })
            .catch(function (err) {
                console.error(err)
            })
    }

    function addGooglePayButton() {
        const clients = getGooglePaymentsClient()
        const button = clients.createButton({
            onClick: onGooglePaymentButtonClicked,
            allowedPaymentMethods: [baseCardPaymentMethod],
            buttonColor: 'black',
            buttonType: 'pay',
            buttonSizeMode: 'fill'
        })

        if (containerRef.current) {
            containerRef.current.innerHTML = '' // Clear existing buttons
            containerRef.current.appendChild(button)
        }
    }

    function getGoogleTransactionInfo() {
        return {
            countryCode: 'BR',
            currencyCode: 'BRL',
            totalPriceStatus: 'FINAL',
            totalPrice: '1.00'
        }
    }

    function onGooglePaymentButtonClicked() {
        const paymentDataRequest = getGooglePaymentDataRequest()
        paymentDataRequest.transactionInfo = getGoogleTransactionInfo()

        const clients = getGooglePaymentsClient()
        clients.loadPaymentData(paymentDataRequest)
            .then(function (paymentData) {
                processPayment(paymentData)
            })
            .catch(function (err) {
                console.error('Loader error:', err)
            })
    }

    async function processPayment(paymentData) {
        console.log('Payment Data:', paymentData)
        try {
            // Extract token
            const paymentToken = paymentData.paymentMethodData.tokenizationData.token
            // For Stripe, this is a stringified JSON
            const parsedToken = JSON.parse(paymentToken)
            const stripeId = parsedToken.id // 'tok_...' or 'pm_...'

            // Send to backend
            const response = await fetch('/api/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: stripeId,
                    price: 100, // 100 cents
                    currency: 'brl'
                }),
            })

            const result = await response.json()

            if (response.ok && result.success) {
                const user = auth.currentUser
                if (user) {
                    const userRef = doc(db, 'users', user.uid)
                    await updateDoc(userRef, {
                        tags: arrayUnion('pro')
                    })
                    alert('Payment Successful! Welcome to Pro.')
                    navigate('/yoky')
                } else {
                    alert('Payment successful, but please login to upgrade.')
                }
            } else {
                console.error('Server error:', result)
                alert('Payment failed: ' + (result.message || 'Unknown error'))
            }

        } catch (err) {
            console.error('Process Payment Error:', err)
            alert('An error occurred during payment processing.')
        }
    }

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', minHeight: '45px', display: 'flex', justifyContent: 'center' }}
        >
            {/* Button will be injected here */}
        </div>
    )
}
