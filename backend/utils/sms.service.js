// Dummy SMS service for development. Replace with real provider in production.
exports.sendSMS = async ({ to, message }) => {
  // In production, integrate with an SMS provider like Twilio, Nexmo, etc.
  console.log(`SMS to ${to}: ${message}`);
  return { success: true };
};
