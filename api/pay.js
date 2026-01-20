import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).end('Method Not Allowed')
    }

    try {
        const { paymentMethodId, currency = 'brl', price = 100 } = req.body

        // Prepare payment intent parameters
        const params = {
            amount: price,
            currency: currency,
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        }

        if (paymentMethodId && paymentMethodId.startsWith('tok_')) {
            params.payment_method_data = {
                type: 'card',
                token: paymentMethodId
            }
        } else {
            params.payment_method = paymentMethodId
        }

        const paymentIntent = await stripe.paymentIntents.create(params)

        // If successful, return the success status
        res.status(200).json({ success: true, paymentIntent })

    } catch (err) {
        console.error('Stripe Error:', err)
        res.status(500).json({ statusCode: 500, message: err.message })
    }
}
