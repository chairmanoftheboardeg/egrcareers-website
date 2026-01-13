
const supabase = {
  auth: { session: () => ({ access_token: "HR_SESSION_TOKEN" }) },
  from: () => ({ select: async()=>({data:[]}), update: async()=>({}) })
};
