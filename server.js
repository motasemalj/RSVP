require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = 'https://viblxbzueoqjmsooxrse.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// RSVP submission endpoint
app.post('/api/rsvp', async (req, res) => {
  const { name, phone, attending } = req.body;

  // Validate input
  if (!name || !phone || !attending) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all fields / يرجى ملء جميع الحقول'
    });
  }

  try {
    // Insert into Supabase
    const { data, error } = await supabase
      .from('rsvps')
      .insert([
        {
          name,
          phone,
          attending: attending === 'yes',
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error saving response. Please try again. / خطأ في حفظ الرد. يرجى المحاولة مرة أخرى.'
      });
    }

    console.log('RSVP saved:', { name, phone, attending });

    res.json({
      success: true,
      message: attending === 'yes'
        ? 'Thank you! We look forward to celebrating with you! / شكراً لك! نتطلع للاحتفال معك!'
        : 'Thank you for letting us know. We will miss you! / شكراً لإعلامنا. سنفتقدك!'
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again. / حدث خطأ. يرجى المحاولة مرة أخرى.'
    });
  }
});

// Get all responses (admin)
app.get('/api/responses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Error reading responses' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error reading responses' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎊 Wedding RSVP server running on port ${PORT}`);
  console.log(`💾 Responses saved to Supabase`);
});
