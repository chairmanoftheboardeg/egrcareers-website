// Get a signed URL instead of public URL
async function signedResumeUrl(path){
  const { data, error } = await supabase
    .storage.from('resumes')
    .createSignedUrl(path, 3600); // 3600 seconds = 1 hour
  return error ? null : data.signedUrl;
}

// inside the loop that builds application cards:
let resumeLink = '';
if (a.resume_path) {
  const url = await signedResumeUrl(a.resume_path);
  if (url) resumeLink = `<a class="btn" href="${url}" target="_blank">View Resume</a>`;
}
