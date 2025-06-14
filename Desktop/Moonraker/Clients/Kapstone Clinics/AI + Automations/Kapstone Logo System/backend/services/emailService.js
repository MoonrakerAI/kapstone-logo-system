// Email service for notifications
// In production, integrate with SendGrid, AWS SES, or similar service

const sendWelcomeEmail = async (clinic) => {
  try {
    console.log(`[EMAIL] Welcome email sent to ${clinic.email}`);
    console.log(`Clinic ID: ${clinic.clinicId}`);
    console.log(`Application received for: ${clinic.name}`);
    
    // In production:
    // const msg = {
    //   to: clinic.email,
    //   from: 'noreply@kapstoneclinics.com',
    //   subject: 'Your Kapstone Directory Application',
    //   html: generateWelcomeEmailHTML(clinic)
    // };
    // await sgMail.send(msg);
    
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

const sendApprovalEmail = async (clinic) => {
  try {
    console.log(`[EMAIL] Approval email sent to ${clinic.email}`);
    console.log(`Clinic ${clinic.name} has been approved!`);
    console.log(`API Key: ${clinic.apiKey}`);
    console.log(`Embed Code: <script src="https://api.kapstoneclinics.com/widget/logo/${clinic.clinicId}"></script>`);
    
    // In production:
    // const msg = {
    //   to: clinic.email,
    //   from: 'noreply@kapstoneclinics.com',
    //   subject: 'Congratulations! Your clinic has been approved',
    //   html: generateApprovalEmailHTML(clinic)
    // };
    // await sgMail.send(msg);
    
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

const generateWelcomeEmailHTML = (clinic) => {
  return `
    <h2>Welcome to Kapstone Clinics Directory</h2>
    <p>Dear ${clinic.metadata.contactPerson || 'Clinic Administrator'},</p>
    
    <p>Thank you for applying to join the Kapstone Clinics Directory. We have received your application for <strong>${clinic.name}</strong>.</p>
    
    <p><strong>Your Clinic ID:</strong> ${clinic.clinicId}</p>
    
    <p>Our team will review your application and verify that your clinic meets our high standards for ketamine-assisted psychotherapy care. This process typically takes 3-5 business days.</p>
    
    <p>Once approved, you will receive:</p>
    <ul>
      <li>An API key for managing your clinic profile</li>
      <li>Embeddable logo code for your website</li>
      <li>Access to your clinic dashboard</li>
      <li>SEO benefits from directory backlinks</li>
    </ul>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>The Kapstone Team</p>
  `;
};

const generateApprovalEmailHTML = (clinic) => {
  return `
    <h2>🎉 Your clinic has been approved!</h2>
    <p>Dear ${clinic.metadata.contactPerson || 'Clinic Administrator'},</p>
    
    <p>Congratulations! <strong>${clinic.name}</strong> has been approved for the Kapstone Clinics Directory.</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Your Integration Details:</h3>
      <p><strong>Clinic ID:</strong> ${clinic.clinicId}</p>
      <p><strong>API Key:</strong> ${clinic.apiKey}</p>
      
      <h4>Embed Code for Your Website:</h4>
      <code style="background: #e9ecef; padding: 10px; display: block; font-family: monospace;">
        &lt;script src="https://api.kapstoneclinics.com/widget/logo/${clinic.clinicId}"&gt;&lt;/script&gt;
      </code>
      
      <p><small>Simply paste this code where you want the Kapstone verification badge to appear on your website.</small></p>
    </div>
    
    <p>Benefits you now have access to:</p>
    <ul>
      <li>✅ Verified clinic badge for your website</li>
      <li>✅ Directory listing with backlink to your site</li>
      <li>✅ Analytics on badge impressions</li>
      <li>✅ Multiple domain support</li>
    </ul>
    
    <p>You can manage your clinic profile and view analytics at: <a href="https://directory.kapstoneclinics.com/dashboard">https://directory.kapstoneclinics.com/dashboard</a></p>
    
    <p>Welcome to the Kapstone family!</p>
    
    <p>Best regards,<br>The Kapstone Team</p>
  `;
};

module.exports = {
  sendWelcomeEmail,
  sendApprovalEmail
};