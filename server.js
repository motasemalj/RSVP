require('dotenv').config();
const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = 'https://viblxbzueoqjmsooxrse.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Resend setup (uses HTTPS, not SMTP — works on Railway)
const resend = new Resend(process.env.RESEND_API_KEY);

// Get RSVP counts from Supabase
const getCounts = async () => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('attending');

  if (error) return { total: 0, attending: 0, declined: 0 };

  const total = data.length;
  const attending = data.filter(r => r.attending === true).length;
  const declined = data.filter(r => r.attending === false).length;

  return { total, attending, declined };
};

// Send email notification with updated counts
const sendNotification = async ({ name, phone, attending }) => {
  const counts = await getCounts();
  const attendingText = attending === 'yes' ? 'Joyfully Accepted ✅' : 'Regretfully Declined ❌';
  const attendingAr = attending === 'yes' ? 'سيحضر ✅' : 'لن يحضر ❌';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Wedding RSVP <onboarding@resend.dev>',
      to: ['motasem.aljayyousi@gmail.com', 'daniaatatreh1@gmail.com'],
      subject: `💍 RSVP: ${name} - ${attending === 'yes' ? 'Attending' : 'Not Attending'} (${counts.attending} attending so far)`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
          
          <div style="text-align: center; padding: 25px; background: linear-gradient(135deg, #2c5530, #1a3d1f); border-radius: 12px 12px 0 0;">
            <p style="color: #d4af37; font-size: 14px; margin: 0 0 5px 0;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <h1 style="color: #d4af37; margin: 0; font-size: 22px;">💍 Wedding RSVP Update</h1>
            <p style="color: #fff; margin: 8px 0 0 0;">Motasem & Dania — 28 March 2026</p>
          </div>

          <div style="background: #fff; padding: 30px; border: 1px solid #e8e8e8;">
            
            <h2 style="color: #2c5530; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
              New Response / رد جديد
            </h2>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr>
                <td style="padding: 10px; color: #888; font-weight: bold; width: 140px;">Name / الاسم</td>
                <td style="padding: 10px; color: #333; font-size: 16px;">${name}</td>
              </tr>
              <tr style="background: #fafafa;">
                <td style="padding: 10px; color: #888; font-weight: bold;">Phone / الهاتف</td>
                <td style="padding: 10px; color: #333; font-size: 16px;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; font-weight: bold;">Response / الرد</td>
                <td style="padding: 10px; color: #333; font-size: 16px;">${attendingText}<br><span style="color: #888;">${attendingAr}</span></td>
              </tr>
            </table>

            <div style="background: linear-gradient(135deg, #f8f9fa, #f0f2f0); border-radius: 10px; padding: 20px; text-align: center;">
              <h3 style="color: #2c5530; margin: 0 0 15px 0; font-size: 16px;">
                📊 Updated Totals / الإحصائيات المحدثة
              </h3>
              <table style="width: 100%; max-width: 350px; margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 15px; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #2c5530;">${counts.attending}</div>
                    <div style="font-size: 12px; color: #888;">Attending<br>سيحضرون</div>
                  </td>
                  <td style="padding: 8px 15px; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #c0a080;">${counts.declined}</div>
                    <div style="font-size: 12px; color: #888;">Declined<br>اعتذروا</div>
                  </td>
                  <td style="padding: 8px 15px; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #d4af37;">${counts.total}</div>
                    <div style="font-size: 12px; color: #888;">Total<br>المجموع</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background: #fafafa; border-radius: 0 0 12px 12px; border: 1px solid #e8e8e8; border-top: none;">
            <p style="margin: 0; color: #aaa; font-size: 12px;">
              بارك الله لكما وبارك عليكما وجمع بينكما في خير
            </p>
          </div>

        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log('Email sent successfully, id:', data?.id);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// RSVP submission endpoint
app.post('/api/rsvp', async (req, res) => {
  const { name, phone, attending } = req.body;

  if (!name || !phone || !attending) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all fields / يرجى ملء جميع الحقول'
    });
  }

  try {
    // Save to Supabase
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

    // Respond to guest immediately
    res.json({
      success: true,
      message: attending === 'yes'
        ? 'Thank you! We look forward to celebrating with you! / شكراً لك! نتطلع للاحتفال معك!'
        : 'Thank you for letting us know. We will miss you! / شكراً لإعلامنا. سنفتقدك!'
    });

    // Send email in background
    sendNotification({ name, phone, attending })
      .then(sent => console.log('Email result:', sent ? 'SENT' : 'FAILED'))
      .catch(err => console.error('Email notification failed:', err.message));

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

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Wedding RSVP <onboarding@resend.dev>',
      to: ['motasem.aljayyousi@gmail.com'],
      subject: 'RSVP Email Test - It Works!',
      html: '<h2>Email notifications are working! / الإشعارات تعمل</h2><p>This is a test from your Wedding RSVP app on Railway.</p>'
    });

    if (error) {
      return res.json({ success: false, error });
    }

    res.json({ success: true, id: data?.id });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎊 Wedding RSVP server running on port ${PORT}`);
  console.log(`💾 Responses saved to Supabase`);
  console.log(`📧 Notifications via Resend API`);
});
