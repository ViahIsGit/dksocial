import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).end('Method Not Allowed')
    }

    try {
        const { paymentMethodId, currency = 'brl', price = 100 } = req.body

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: price,
            currency: currency,
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never' // Depending on flow, you might want this
            },
            // return_url: 'https://any.com' // Required if redirects are allowed
        })

        // If successful, return the success status
        res.status(200).json({ success: true, paymentIntent })

    } catch (err) {
        console.error('Stripe Error:', err)
        res.status(500).json({ statusCode: 500, message: err.message })
    }
}
