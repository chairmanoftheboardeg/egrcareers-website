
async function acceptApplication(app) {
  await fetch("https://dvcbbvvxbpxzpxaadoco.supabase.co/functions/v1/discord-onboard", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer HR_SESSION_TOKEN"
    },
    body: JSON.stringify({
      discord_id: app.discord_id,
      role_title: app.role_title
    })
  });
  alert("Accepted & onboarded");
}
