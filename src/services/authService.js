import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";


export async function iniciarSesion(
  correo,
  password
) {
  const email =
    String(
      correo || ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      "Ingresa tu correo."
    );
  }

  if (!password) {
    throw new Error(
      "Ingresa tu contraseña."
    );
  }

  let credencial;

  try {
    credencial =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
  } catch (error) {
    if (
      error?.code ===
        "auth/invalid-credential" ||
      error?.code ===
        "auth/user-not-found" ||
      error?.code ===
        "auth/wrong-password"
    ) {
      throw new Error(
        "Correo o contraseña incorrectos."
      );
    }

    if (
      error?.code ===
      "auth/too-many-requests"
    ) {
      throw new Error(
        "Demasiados intentos. Intenta nuevamente más tarde."
      );
    }

    throw new Error(
      "No se pudo iniciar sesión."
    );
  }

  const usuario =
    credencial.user;

  try {
    const referencia =
      doc(
        db,
        "usuarios",
        usuario.uid
      );

    const snapshot =
      await getDoc(
        referencia
      );

    /*
      SEGURIDAD:
      Ninguna cuenta de Firebase Authentication puede entrar
      si no tiene un perfil autorizado en Firestore.
    */
    if (!snapshot.exists()) {
      await signOut(auth);

      throw new Error(
        "Esta cuenta no tiene un perfil autorizado."
      );
    }

    const perfil = {
      id:
        snapshot.id,

      ...snapshot.data(),
    };

    if (
      perfil.activo !== true
    ) {
      await signOut(auth);

      throw new Error(
        "Esta cuenta está desactivada."
      );
    }

    return {
      usuario,
      perfil,
    };
  } catch (error) {
    if (
      auth.currentUser?.uid ===
      usuario.uid
    ) {
      await signOut(auth);
    }

    throw error;
  }
}


export function observarSesion(
  callback
) {
  return onAuthStateChanged(
    auth,
    callback
  );
}


export async function cerrarSesion() {
  await signOut(auth);
}


export async function recuperarPassword(
  correo
) {
  const email =
    String(
      correo || ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      "Ingresa tu correo."
    );
  }

  await sendPasswordResetEmail(
    auth,
    email
  );
}
