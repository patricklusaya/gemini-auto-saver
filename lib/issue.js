const { signProLicense } = require("./sign");
const { sendLicenseEmail } = require("./email");

async function issuePaidLicense({ orderId, email, source }) {
  const licenseKey = signProLicense({ orderId, email });
  await sendLicenseEmail({ to: email, licenseKey, orderId, source });
  return licenseKey;
}

module.exports = { issuePaidLicense };
