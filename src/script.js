const clientId = import.meta.env.VITE_CLIENT_ID;

const params = new URLSearchParams(window.location.search);
const code = params.get("code");
const generateCodeVerifier = (length) => {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const generateCodeChallenge = async (codeVerifier) => {
  const base64encode = (string) => {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);

  return base64encode(digest);
};

const redirectToAuthCodeFlow = async () => {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

const getAccessToken = async (clientId, code) => {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const { access_token } = await result.json();

  return access_token;
};

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}

const form = document.getElementById("form_music");
let searchQuery = "";

const handleSubmit = (event) => {
  event.preventDefault();
  searchQuery = event.target[0].value;
  return searchQuery;
};

form.addEventListener("submit", handleSubmit);

const populateSearchUI = async (token, query) => {
  const result = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&market=FR&limit=1&include_external=audio`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await result.json();
  console.log(data);

  document.getElementById("title").innerText = data.tracks.items[0].name;
  document.getElementById("artist_name").innerText =
    data.tracks.items[0].artists[0].name;

  document.getElementById("release_date").innerText =
    data.tracks.items[0].album.release_date;

  document.getElementById(
    "music"
  ).innerHTML = `<source src=${data.tracks.items[0].preview_url} />`;
};

const accessToken = await getAccessToken(clientId, code);

if (!accessToken) {
  redirectToAuthCodeFlow();
} else {
  console.log(accessToken);
  const profile = await fetchProfile(accessToken);
  populateUI(profile);
  populateSearchUI(accessToken, "gods plan");
}
