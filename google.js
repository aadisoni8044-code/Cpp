// ============================================================================
// google.js - Google Authentication & Firestore Sync System for plo.io
// ============================================================================

import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// --- PLACEHOLDER CONFIGURATION ---
// Please paste your Firebase Project configuration here.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Track currently logged-in user
let currentUser = null;

// --- GOOGLE AUTHENTICATION HANDLERS ---

/**
 * Initiates the Google Sign-In popup flow.
 */
export async function loginWithGoogle() {
    try {
        console.log("[Auth] Initiating Google Sign-In popup...");
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`[Auth] Google Sign-In successful for: ${user.displayName}`);
    } catch (error) {
        console.error("[Auth] Error during Google Sign-In:", error);
        alert(`Sign-in failed: ${error.message}`);
    }
}

/**
 * Signs out the currently authenticated user.
 */
export async function logoutUser() {
    try {
        console.log("[Auth] Initiating sign-out...");
        await signOut(auth);
        console.log("[Auth] Sign-out successful.");
    } catch (error) {
        console.error("[Auth] Error during sign-out:", error);
    }
}

// Attach Auth State Listener to maintain user login session across refreshes
onAuthStateChanged(auth, async (user) => {
    const loggedOutSection = document.getElementById("google-logged-out");
    const loggedInSection = document.getElementById("google-logged-in");
    const userPhoto = document.getElementById("google-user-photo");
    const userName = document.getElementById("google-user-name");
    const userEmail = document.getElementById("google-user-email");

    if (user) {
        currentUser = user;
        console.log(`[Auth] User authenticated: ${user.email} (${user.uid})`);

        // Fetch user data from Firestore or initialize if new
        const playerDoc = await getOrCreatePlayerDoc(user);

        // Update local game state with fetched database stats
        if (playerDoc) {
            updateLocalGameState(playerDoc, user);
        }

        // Toggle UI widgets to Logged In state
        if (loggedOutSection) loggedOutSection.style.display = "none";
        if (loggedInSection) loggedInSection.style.display = "flex";

        if (userPhoto) userPhoto.src = user.photoURL || "https://placehold.co/32";
        if (userName) userName.innerText = user.displayName || "Google User";
        if (userEmail) userEmail.innerText = user.email || "";

        // Update mini and large profile avatars with actual Google profile picture
        updateUIAvatars(user.photoURL);

    } else {
        currentUser = null;
        console.log("[Auth] User logged out.");

        // Toggle UI widgets to Logged Out state
        if (loggedOutSection) loggedOutSection.style.display = "block";
        if (loggedInSection) loggedInSection.style.display = "none";

        // Reset avatars to default emoji 👤
        updateUIAvatars(null);
    }
});

// --- CLOUD DATABASE SYNC (FIRESTORE) ---

/**
 * Retrieves the user profile from the Firestore 'players' collection.
 * Creates a new document with +50 PLO Coins sign-up bonus if it doesn't exist.
 */
async function getOrCreatePlayerDoc(user) {
    const docRef = doc(db, "players", user.uid);
    try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("[Firestore] Found returning player profile:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("[Firestore] No profile found. Initializing new player profile...");

            // Get current local coins if any, and add +50 sign-up bonus coins
            const currentLocalCoins = window.UI_STATE ? window.UI_STATE.ploCoins : 0;
            const initialCoins = currentLocalCoins + 50;

            const initialData = {
                displayName: user.displayName || "WaveRunner",
                email: user.email || "",
                photoURL: user.photoURL || "",
                plo_coins: initialCoins,
                high_score: 0,
                rating: 1000,
                active_days: 1,
                createdAt: new Date().toISOString()
            };

            await setDoc(docRef, initialData);
            console.log("[Firestore] Successfully created new player record with +50 Coins signup bonus.");

            // Show alert/notification about the bonus coins
            alert("Welcome! You've received a +50 PLO Coins signup bonus!");
            return initialData;
        }
    } catch (e) {
        console.error("[Firestore] Error fetching/creating player document:", e);
        return null;
    }
}

/**
 * Loads values fetched from Firestore directly into the running game state.
 */
function updateLocalGameState(cloudData, user) {
    if (!window.UI_STATE || !window.KEYS) return;

    console.log("[Game State] Merging cloud database stats into local state...");

    // 1. Update stats
    window.UI_STATE.ploCoins = cloudData.plo_coins || 0;
    window.UI_STATE.eloRating = cloudData.rating || 1000;
    window.UI_STATE.streakDays = cloudData.active_days || 1;
    window.UI_STATE.username = cloudData.displayName || user.displayName || "WaveRunner";

    // 2. Persistent Save to local storage to sync across engines
    localStorage.setItem(window.KEYS.COINS, window.UI_STATE.ploCoins.toString());
    localStorage.setItem(window.KEYS.RATING, window.UI_STATE.eloRating.toString());
    localStorage.setItem(window.KEYS.STREAK, window.UI_STATE.streakDays.toString());
    localStorage.setItem(window.KEYS.USERNAME, window.UI_STATE.username);

    if (cloudData.high_score) {
        localStorage.setItem("plo_io_endless_hiscore_v2", cloudData.high_score.toString());
        if (typeof window.updateEngineMenuTags === "function") {
            window.updateEngineMenuTags();
        }
    }

    // 3. Trigger UI Repaint to update HUD and modals
    if (typeof window.renderHeaderWidgets === "function") {
        window.renderHeaderWidgets();
    }
    if (typeof window.renderProfileDetails === "function") {
        window.renderProfileDetails();
    }
    if (typeof window.renderLevelSelector === "function") {
        window.renderLevelSelector();
    }
}

/**
 * Updates UI profile picture element icons with user photoURL image.
 */
function updateUIAvatars(photoURL) {
    const avatarMini = document.querySelector(".profile-avatar");
    if (avatarMini) {
        if (photoURL) {
            avatarMini.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarMini.innerHTML = "👤";
        }
    }
    const avatarLarge = document.querySelector(".profile-avatar-large");
    if (avatarLarge) {
        if (photoURL) {
            avatarLarge.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarLarge.innerHTML = "👤";
        }
    }
}

// --- INTERCEPT LOCAL STORAGE SAVES TO AUTO-SYNC TO FIRESTORE ---

/**
 * Hook into standard localStorage.setItem writes to capture rating, distance and coins
 * updates in real-time, syncing them automatically to Firestore without invasive hacks.
 */
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, val) {
    // Invoke standard local write
    originalSetItem.apply(this, arguments);

    // If a user is logged in, sync changes instantly to Firestore
    if (currentUser) {
        syncLocalStorageKeyToCloud(key, val);
    }
};

async function syncLocalStorageKeyToCloud(key, val) {
    if (!currentUser) return;

    const userDocRef = doc(db, "players", currentUser.uid);
    try {
        const updateData = {};

        if (key === "plo_coins_balance") {
            updateData.plo_coins = parseInt(val) || 0;
        } else if (key === "plo_login_streak") {
            updateData.active_days = parseInt(val) || 0;
        } else if (key === "plo_skill_rating") {
            updateData.rating = parseInt(val) || 1000;
        } else if (key === "plo_io_endless_hiscore_v2") {
            updateData.high_score = parseInt(val) || 0;
        } else if (key === "plo_username") {
            updateData.displayName = val;
        }

        if (Object.keys(updateData).length > 0) {
            await updateDoc(userDocRef, updateData);
            console.log(`[Cloud Sync] Synced '${key}' to Firestore.`);
        }
    } catch (err) {
        console.error(`[Cloud Sync] Error syncing key '${key}':`, err);
    }
}

// Expose handlers globally to the window object so inline HTML onclicks can invoke them
window.loginWithGoogle = loginWithGoogle;
window.logoutUser = logoutUser;
