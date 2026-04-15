import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ message: 'Missing payment reference' });
  }

  try {
    // 1. Verify payment with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await paystackRes.json();

    if (!data.status || data.data.status !== 'success') {
      return res.status(403).json({ message: 'Payment verification failed or payment not successful' });
    }

    if (data.data.amount < 1000000) { // Paystack operates in kobo (10000 NGN = 1000000 Kobo)
        return res.status(403).json({ message: 'Invalid payment amount' });
    }

    // 2. Serve the PDF securely
    const filePath = path.join(process.cwd(), 'beyond-potential.pdf');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
    }

    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="Beyond_Potential.pdf"'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error while verifying payment' });
  }
}
