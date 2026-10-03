const { signProLicense } = require("./sign");
const { sendLicenseEmail } = require("./email");
const { recordPaid } = require("./entitlements");

async function issuePaidLicense({ orderId, email, source }) {
  const licenseKey = signProLicense({ orderId, email });
  try {
    await recordPaid({ orderId, email, source });
  } catch (error) {
    console.error("Could not store entitlement:", error && error.message);
    throw error;
  }
  await sendLicenseEmail({ to: email, licenseKey, orderId, source });
  return licenseKey;
}

module.exports = { issuePaidLicense };
