import axios from 'axios';

const INFORU_USERNAME = 'admin@chatgo.live';
const INFORU_API_TOKEN = '1aa14226-ceae-4104-ba86-899eca88631d';
const INFORU_URL = 'https://uapi.inforu.co.il/SendMessageXml.ashx';

/**
 * Send SMS message using Inforu API
 * Based on official Inforu API documentation: https://apidoc.inforu.co.il
 * @param {string} text - The message text to send
 * @param {string|string[]} phoneNumbers - Phone number(s) to send to (can be single number or array)
 * @param {string} senderName - Sender name/identifier
 * @returns {Promise<void>}
 */
async function sendMessage(text, phoneNumbers, senderName) {
  // Ensure phoneNumbers is an array
  const phoneArray = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
  
  console.log('📱 [SMS Service] ===== Starting SMS Send =====');
  console.log('📱 [SMS Service] Phone numbers:', phoneArray);
  console.log('📱 [SMS Service] Message text:', text);
  console.log('📱 [SMS Service] Sender name:', senderName);
  
  // Build XML according to Inforu API documentation
  // Format: <Inforu><User><Username>...</Username><ApiToken>...</ApiToken></User>...
  const xmlString = `<Inforu>
                    <User>
                        <Username>${INFORU_USERNAME}</Username>
                        <ApiToken>${INFORU_API_TOKEN}</ApiToken>
                    </User>
                    <Content Type="sms">
                        <Message>${text}</Message>
                    </Content>
                    <Recipients>` +
                        phoneArray.map(number => `<PhoneNumber>${number}</PhoneNumber>`).join('') +
                    `</Recipients>
                    <Settings>
                        <Sender>${senderName}</Sender>
                    </Settings>
                    </Inforu>`;

  console.log('📱 [SMS Service] XML String:');
  console.log(xmlString);

  // According to Inforu API documentation, send as form data with InforuXML parameter
  // Try both encodeURI and encodeURIComponent to see which works
  const encodedXml = encodeURI(xmlString);
  const formData = `InforuXML=${encodedXml}`;
  
  console.log('📱 [SMS Service] Encoded XML (first 500 chars):', encodedXml.substring(0, 500));
  console.log('📱 [SMS Service] Form Data (first 500 chars):', formData.substring(0, 500));
  console.log('📱 [SMS Service] URL:', INFORU_URL);

  try {
    // POST request to Inforu API endpoint
    console.log('📱 [SMS Service] Sending POST request...');
    const response = await axios.post(INFORU_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('📱 [SMS Service] ===== Response Received =====');
    console.log('📱 [SMS Service] Status:', response.status);
    console.log('📱 [SMS Service] Status Text:', response.statusText);
    console.log('📱 [SMS Service] Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📱 [SMS Service] Response data type:', typeof response.data);
    console.log('📱 [SMS Service] Response data:', response.data);
    console.log('📱 [SMS Service] Response data length:', response.data ? response.data.length : 0);

    // Check response - API returns "Message accepted successfully" on success
    const responseData = typeof response.data === 'string' ? response.data : String(response.data);
    
    console.log('📱 [SMS Service] Checking for success message...');
    console.log('📱 [SMS Service] Looking for "Message accepted successfully"');
    console.log('📱 [SMS Service] Index of success message:', responseData.indexOf("Message accepted successfully"));
    
    // Check for various success indicators
    const hasSuccessMessage = responseData.indexOf("Message accepted successfully") !== -1;
    const hasAccepted = responseData.toLowerCase().indexOf("accepted") !== -1;
    const hasSuccess = responseData.toLowerCase().indexOf("success") !== -1;
    const is200 = response.status === 200;
    
    console.log('📱 [SMS Service] Success indicators:');
    console.log('  - Has "Message accepted successfully":', hasSuccessMessage);
    console.log('  - Has "accepted":', hasAccepted);
    console.log('  - Has "success":', hasSuccess);
    console.log('  - Status 200:', is200);
    
    if (!hasSuccessMessage) {
      console.log("❌ [SMS Service] ERROR: SMS sending failed - success message not found");
      console.log("❌ [SMS Service] Full response:", responseData);
      // Don't throw error if status is 200 and response seems OK
      if (is200 && (hasAccepted || hasSuccess)) {
        console.log("⚠️ [SMS Service] WARNING: Status 200 but no exact success message - might still be OK");
      } else {
        throw new Error(`SMS sending failed: ${responseData}`);
      }
    } else {
      console.log("✅ [SMS Service] SMS sent successfully - success message found");
    }
  } catch (err) {
    console.error('❌ [SMS Service] ===== Error Caught =====');
    console.error('❌ [SMS Service] Error type:', err.constructor.name);
    console.error('❌ [SMS Service] Error message:', err.message);
    if (err.response) {
      console.error('❌ [SMS Service] Response status:', err.response.status);
      console.error('❌ [SMS Service] Response data:', err.response.data);
      console.error('❌ [SMS Service] Response headers:', err.response.headers);
    } else if (err.request) {
      console.error('❌ [SMS Service] Request made but no response received');
      console.error('❌ [SMS Service] Request:', err.request);
    } else {
      console.error('❌ [SMS Service] Error setting up request:', err.message);
    }
    console.error('❌ [SMS Service] Full error:', err);
    throw err;
  }
}

export default {
  sendMessage
};
