import { getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

export const getFirebaseAdminAuth = () => {
    const existingApp = getApps().find((app) => app.name === "google-auth")
    if (existingApp) {
        return getAuth(existingApp)
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || "online-food-delivery-3cb50"
    const firebaseApp = initializeApp({ projectId }, "google-auth")
    return getAuth(firebaseApp)
}
