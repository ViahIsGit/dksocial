import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'

// Note: Replace with your actual publishable key in production
const stripePromise = loadStripe('pk_live_51SrRAMRsNEBjuuaS5kHXHXyqJBUR1TJhyX64FYWUGXCTDbrIsXyyIU3Rch6Uyx778OumNnetrYrJAeVqm9Pgrc9l00KCFXi2Kh')

const PaymentButtons = ({ price }) => {
    const stripe = useStripe()
    const [paymentRequest, setPaymentRequest] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!stripe) return

        const pr = stripe.paymentRequest({
            country: 'BR',
            currency: 'brl',
            total: {
                label: 'Lifetime Pro Access',
                amount: 100, // 100 cents = 1.00 BRL
            },
            requestPayerName: true,
            requestPayerEmail: true,
        })

        // Check availability (Google Pay / Apple Pay)
        pr.canMakePayment().then(result => {
            if (result) {
                setPaymentRequest(pr)
            } else {
                console.log('Payment Request not available')
            }
        })

        pr.on('paymentmethod', async (ev) => {
            // In a real app, send ev.paymentMethod.id to your backend.
            // Here, we simulate a successful server confirmation.

            try {
                // Call Vercel Serverless Function
                const response = await fetch('/api/pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentMethodId: ev.paymentMethod.id,
                        price: 100, // 100 cents
                        currency: 'brl'
                    }),
                })

                const result = await response.json()

                if (response.ok && result.success) {
                    ev.complete('success')

                    // --- ENABLE PRO FEATURES ---
                    const user = auth.currentUser
                    if (user) {
                        const userRef = doc(db, 'users', user.uid)
                        await updateDoc(userRef, {
                            tags: arrayUnion('pro')
                        })

                        alert('Payment Successful! Welcome to Pro.')
                        navigate('/yoky')
                    }
                } else {
                    ev.complete('fail')
                    console.error('Payment failed on server:', result.message)
                    alert('Payment processing failed. Please try again.')
                }

            } catch (err) {
                console.error('Payment error:', err)
                ev.complete('fail')
                alert('Payment failed. Please try again.')
            }


        })

    }, [stripe, price, navigate])

    if (!paymentRequest) {
        return (
            <div style={{ textAlign: 'center', opacity: 0.7, marginTop: '10px' }}>
                <p>Google Pay is not available on this device.</p>
            </div>
        )
    }

    return (
        <PaymentRequestButtonElement options={{ paymentRequest }} />
    )
}

export default function StripePayment() {
    return (
        <Elements stripe={stripePromise}>
            <PaymentButtons price={100} />
        </Elements>
    )
}
