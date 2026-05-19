import axios from 'axios';

const INFORU_EMAIL_USERNAME = 'admin@chatgo.live'; // Same as SMS username
const INFORU_EMAIL_TOKEN = '1aa14226-ceae-4104-ba86-899eca88631d'; // Same as SMS token
const INFORU_EMAIL_URL = 'https://capi.mesergo.co.il/mail/api.php';

// Default from address - should be whitelisted in Mesergo account
// Use the username email or set EMAIL_FROM_ADDRESS in environment variables
const DEFAULT_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || INFORU_EMAIL_USERNAME;

/**
 * Send email message using Inforu InfoMail API
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML)
 * @param {string} fromAddress - Sender email address
 * @param {string} fromName - Sender name
 * @param {string} campaignName - Campaign name for reports
 * @returns {Promise<Object>} Promise that resolves with success status
 */
async function sendEmail(toEmail, subject, body, fromAddress = DEFAULT_FROM_ADDRESS, fromName = 'ZimmerPro', campaignName = 'OTP Verification') {
  try {
    console.log('📧 [Email Service] ===== Starting Email Send =====');
    console.log('📧 [Email Service] To:', toEmail);
    console.log('📧 [Email Service] Subject:', subject);
    console.log('📧 [Email Service] From:', `${fromName} <${fromAddress}>`);

    // Build XML according to Inforu InfoMail API documentation
    const xmlString = `<InfoMailClient>
<SendEmails>
<User>
<Username>${INFORU_EMAIL_USERNAME}</Username>
<Token>${INFORU_EMAIL_TOKEN}</Token>
</User>
<Message>
<CampaignName>${campaignName}</CampaignName>
<FromAddress>${fromAddress}</FromAddress>
<FromName>${fromName}</FromName>
<Subject><![CDATA[${subject}]]></Subject>
<Body><![CDATA[${body}]]></Body>
</Message>
<Recipients>
<Email address="${toEmail}" />
</Recipients>
</SendEmails>
</InfoMailClient>`;

    console.log('📧 [Email Service] XML String:');
    console.log(xmlString);

    // URL encode the XML and send as GET parameter
    // Use encodeURIComponent to properly encode special characters like <, >, &, etc.
    const encodedXml = encodeURIComponent(xmlString);
    const url = `${INFORU_EMAIL_URL}?xml=${encodedXml}`;

    console.log('📧 [Email Service] URL (first 500 chars):', url.substring(0, 500));

    // Send GET request to Inforu InfoMail API
    console.log('📧 [Email Service] Sending GET request...');
    const response = await axios.get(url, {
      timeout: 30000 // 30 second timeout
    });

    console.log('📧 [Email Service] ===== Response Received =====');
    console.log('📧 [Email Service] Status:', response.status);
    console.log('📧 [Email Service] Status Text:', response.statusText);
    console.log('📧 [Email Service] Response data type:', typeof response.data);
    console.log('📧 [Email Service] Response data:', response.data);

    // Parse XML response
    const responseData = typeof response.data === 'string' ? response.data : String(response.data);
    
    console.log('📧 [Email Service] Checking response...');
    
    // Check for success in XML response
    // Response format: <InfoMailResponse><SendEmails><Status>STATUS</Status>...
    const statusMatch = responseData.match(/<Status>(.*?)<\/Status>/);
    const campaignIdMatch = responseData.match(/<CampaignId>(.*?)<\/CampaignId>/);
    
    const status = statusMatch ? statusMatch[1].trim() : null;
    const campaignId = campaignIdMatch ? campaignIdMatch[1].trim() : null;
    
    console.log('📧 [Email Service] Status from XML:', status);
    console.log('📧 [Email Service] Campaign ID:', campaignId);
    
    // Check if email was sent successfully
    // Status can be "Success" or similar
    const isSuccess = status && (
      status.toLowerCase().includes('success') || 
      status.toLowerCase() === 'ok' ||
      response.status === 200
    );
    
    if (isSuccess || (response.status === 200 && campaignId)) {
      console.log('✅ [Email Service] Email sent successfully');
      return {
        success: true,
        message: 'Email sent successfully',
        campaignId: campaignId
      };
    } else {
      console.error('❌ [Email Service] Email sending failed');
      console.error('❌ [Email Service] Status:', status);
      console.error('❌ [Email Service] Full response:', responseData);
      throw new Error(`Email sending failed: ${status || responseData}`);
    }
  } catch (err) {
    console.error('❌ [Email Service] ===== Error Caught =====');
    console.error('❌ [Email Service] Error type:', err.constructor.name);
    console.error('❌ [Email Service] Error message:', err.message);
    if (err.response) {
      console.error('❌ [Email Service] Response status:', err.response.status);
      console.error('❌ [Email Service] Response data:', err.response.data);
    } else if (err.request) {
      console.error('❌ [Email Service] Request made but no response received');
    } else {
      console.error('❌ [Email Service] Error setting up request:', err.message);
    }
    throw err;
  }
}

export default {
  sendEmail
};
