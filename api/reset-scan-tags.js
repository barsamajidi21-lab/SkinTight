export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  
  try {
    const response = await fetch(
      "https://onesignal.com/api/v1/apps/" + ONESIGNAL_APP_ID + "/users/tags",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + ONESIGNAL_REST_API_KEY
        },
        body: JSON.stringify({
          tags: {
            "is_scan_completed": "false"
          }
        })
      }
    );
    
    const data = await response.json();
    console.log("Tags reset successfully:", data);
    return res.status(200).json({ 
      success: true, 
      message: "All users reset to scan pending",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Reset failed:", error);
    return res.status(500).json({ error: "Reset failed", details: error.message });
  }
}

/*
IMPORTANT SETUP STEPS:
Go to Vercel Dashboard → Your Project → Settings → Environment Variables
Add these three variables:

Name: ONESIGNAL_APP_ID
Value: 9960c3dd-03ff-4220-8a73-77ff77838dad

Name: ONESIGNAL_REST_API_KEY  
Value: (paste your OneSignal REST API Key here — found in OneSignal → Settings → Keys and IDs)

Name: CRON_SECRET
Value: (create any random string you want, example: skintight2025secure)

After adding these redeploy your Vercel project.
The cron job will then run automatically every Sunday at 11 PM.
*/
