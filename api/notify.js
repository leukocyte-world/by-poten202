export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, phone, address, reference } = req.body;

  if (!name || !email || !reference) {
    return res.status(400).json({ message: 'Missing required details' });
  }

  try {
    // 1. Verify payment with Paystack first to ensure this is a legit notification
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await paystackRes.json();

    if (!data.status || data.data.status !== 'success') {
      return res.status(403).json({ message: 'Payment verification failed' });
    }

    if (data.data.amount < 1000000) {
        return res.status(403).json({ message: 'Invalid payment amount' });
    }

    // 2. Send Email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_SECRET_KEY}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Fallback for unverified domains
        to: ['wculture09@gmail.com'], // Must be the email registered on the Resend account for onboarding@resend.dev to work
        subject: `New Book Order: ${name}`,
        html: `
          <h2>New Order for Beyond Potential (Hard Copy)</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Delivery Address:</strong> ${address || 'Not provided'}</p>
          <p><strong>Reference:</strong> ${reference}</p>
          <p>Please arrange for physical delivery via dispatch.</p>
        `
      })
    });

    if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error('Resend Error:', errorText);
        // We still return success to the frontend because payment was good, 
        // even if notification failed, so the user can download their file.
        return res.status(200).json({ message: 'Payment verified, but email notification failed' });
    }

    res.status(200).json({ message: 'Notification sent successfully' });

  } catch (error) {
    console.error('Notify error:', error);
    res.status(500).json({ message: 'Internal server error while notifying' });
  }
}
