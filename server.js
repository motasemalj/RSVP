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
      to: ['motasem.aljayyousi@gmail.com'],
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
      console.error('Resend error:', JSON.stringify(error));
      // Store last error for debugging
      sendNotification.lastError = error;
      return false;
    }

    console.log('Email sent successfully, id:', data?.id);
    return true;
  } catch (error) {
    console.error('Email error:', error.message || error);
    sendNotification.lastError = error.message || error;
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

    // Send email before responding
    let emailSent = false;
    try {
      emailSent = await sendNotification({ name, phone, attending });
      console.log('Email result:', emailSent ? 'SENT' : 'FAILED');
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }

    res.json({
      success: true,
      emailSent,
      emailError: emailSent ? null : (sendNotification.lastError || 'unknown'),
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

// Get all responses (admin) - beautiful HTML dashboard
app.get('/api/responses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Error reading responses' });
    }

    const total = data.length;
    const attending = data.filter(r => r.attending === true);
    const declined = data.filter(r => r.attending === false);

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&family=Cormorant+Garamond:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cormorant Garamond', serif; background: #faf8f5; min-height: 100vh; padding: 30px 20px; }
    .dashboard { max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; color: #1a3d1f; font-size: 2.2rem; font-weight: 400; margin-bottom: 5px; }
    .subtitle { text-align: center; font-family: 'Tajawal', sans-serif; color: #888; margin-bottom: 30px; font-size: 1rem; }
    
    .stats { display: flex; gap: 15px; margin-bottom: 35px; }
    .stat-card { flex: 1; background: #fff; border-radius: 14px; padding: 25px 15px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .stat-number { font-size: 2.8rem; font-weight: 600; line-height: 1; margin-bottom: 6px; }
    .stat-label { font-size: 0.95rem; color: #888; }
    .stat-label-ar { font-family: 'Tajawal', sans-serif; font-size: 0.85rem; color: #aaa; }
    .stat-attending .stat-number { color: #2c5530; }
    .stat-declined .stat-number { color: #c0a080; }
    .stat-total .stat-number { color: #d4af37; }
    
    .section { margin-bottom: 30px; }
    .section-title { font-size: 1.3rem; color: #1a3d1f; padding-bottom: 10px; border-bottom: 2px solid #d4af37; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
    .section-badge { background: #2c5530; color: #fff; font-size: 0.8rem; padding: 3px 10px; border-radius: 20px; }
    .section-badge.decline { background: #c0a080; }
    
    .guest-list { display: flex; flex-direction: column; gap: 10px; }
    .guest-card { background: #fff; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border-left: 4px solid #2c5530; transition: transform 0.2s; }
    .guest-card:hover { transform: translateX(4px); }
    .guest-card.declined { border-left-color: #c0a080; }
    .guest-name { font-size: 1.2rem; color: #2d2d2d; font-weight: 500; }
    .guest-phone { font-size: 0.95rem; color: #888; margin-top: 3px; font-family: 'Tajawal', sans-serif; }
    .guest-time { font-size: 0.8rem; color: #aaa; text-align: right; font-family: 'Tajawal', sans-serif; white-space: nowrap; }
    
    .empty { text-align: center; color: #aaa; padding: 20px; font-style: italic; }
    .refresh { display: block; margin: 20px auto; padding: 12px 30px; background: linear-gradient(135deg, #1a3d1f, #2c5530); color: #fff; border: none; border-radius: 10px; font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; cursor: pointer; }
    .refresh:hover { opacity: 0.9; }
    
    @media (max-width: 600px) {
      .stats { flex-direction: row; gap: 10px; }
      .stat-card { padding: 18px 10px; }
      .stat-number { font-size: 2rem; }
      .guest-card { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Motasem & Dania</h1>
    <p class="subtitle">RSVP Dashboard / لوحة تأكيد الحضور</p>
    
    <div class="stats">
      <div class="stat-card stat-attending">
        <div class="stat-number">${attending.length}</div>
        <div class="stat-label">Attending</div>
        <div class="stat-label-ar">سيحضرون</div>
      </div>
      <div class="stat-card stat-declined">
        <div class="stat-number">${declined.length}</div>
        <div class="stat-label">Declined</div>
        <div class="stat-label-ar">اعتذروا</div>
      </div>
      <div class="stat-card stat-total">
        <div class="stat-number">${total}</div>
        <div class="stat-label">Total</div>
        <div class="stat-label-ar">المجموع</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Attending <span class="section-badge">${attending.length}</span></h2>
      <div class="guest-list">
        ${attending.length === 0 ? '<p class="empty">No responses yet</p>' : attending.map((g, i) => `
          <div class="guest-card">
            <div>
              <div class="guest-name">${i + 1}. ${g.name}</div>
              <div class="guest-phone">${g.phone}</div>
            </div>
            <div class="guest-time">${new Date(g.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Declined <span class="section-badge decline">${declined.length}</span></h2>
      <div class="guest-list">
        ${declined.length === 0 ? '<p class="empty">No declines yet</p>' : declined.map((g, i) => `
          <div class="guest-card declined">
            <div>
              <div class="guest-name">${i + 1}. ${g.name}</div>
              <div class="guest-phone">${g.phone}</div>
            </div>
            <div class="guest-time">${new Date(g.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <button class="refresh" onclick="location.reload()">Refresh / تحديث</button>
  </div>
</body>
</html>
    `);
  } catch (err) {
    res.status(500).json({ error: 'Error reading responses' });
  }
});

// Debug Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .limit(1);

    if (error) {
      return res.json({ success: false, error, hint: 'Did you create the rsvps table? Check the SQL in README.' });
    }

    res.json({ success: true, rowCount: data.length, supabaseKey: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET' });
  } catch (err) {
    res.json({ success: false, error: err.message });
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
