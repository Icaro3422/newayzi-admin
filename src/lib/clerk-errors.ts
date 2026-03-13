/**
 * Mapeo de errores de Clerk a mensajes amigables en español.
 * Usado en perfil, sign-up, sign-in y cualquier flujo que use la API de Clerk.
 */

const CLERK_ERROR_MESSAGES: Record<string, string> = {
  // Identificadores
  form_identifier_not_found: "No encontramos una cuenta con ese correo electrónico.",
  form_identifier_exists: "Ya existe una cuenta con ese correo electrónico.",
  "form_identifier_exists__email_address": "Ya existe una cuenta con ese correo electrónico.",
  "form_identifier_exists__username": "Ese nombre de usuario ya está en uso.",
  "form_identifier_exists__phone_number": "Ese número de teléfono ya está registrado.",

  // Contraseña
  form_password_incorrect: "La contraseña es incorrecta. Inténtalo de nuevo.",
  form_password_pwned: "Esta contraseña es muy común. Elige una más segura.",
  form_password_length_too_short: "La contraseña debe tener al menos 8 caracteres.",
  form_param_format_invalid__email_address: "El formato del correo electrónico no es válido.",

  // Parámetros
  form_param_missing: "Por favor completa todos los campos obligatorios.",
  form_param_format_invalid: "El formato de uno de los campos no es válido.",
  form_param_unknown: "No se puede actualizar ese campo. Verifica la configuración de tu cuenta.",
  form_param_max_length_exceeded: "El texto es demasiado largo. Acorta el campo.",
  form_param_type_invalid: "El valor ingresado no es válido.",

  // Códigos
  form_code_incorrect: "El código ingresado es incorrecto. Verifica e intenta de nuevo.",
  form_code_expired: "El código ha expirado. Solicita uno nuevo.",

  // Rate limit y sesión
  too_many_requests: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  session_exists: "Ya tienes una sesión activa.",

  // Imagen de perfil
  image_file_size_limit_exceeded: "La imagen es demasiado grande. Usa una de menos de 10 MB.",
  image_file_type_not_allowed: "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
};

export type ClerkErrorShape = {
  errors?: Array<{
    code?: string;
    message?: string;
    longMessage?: string;
    meta?: { paramName?: string };
  }>;
  message?: string;
};

/**
 * Resuelve un error de Clerk a un mensaje amigable en español.
 */
export function resolveClerkError(err: unknown): string {
  const clerkErr = (err as ClerkErrorShape)?.errors?.[0];
  if (!clerkErr) {
    return (err as { message?: string })?.message || "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
  const code = clerkErr.code ?? "";
  const key =
    code === "form_param_format_invalid" && clerkErr.meta?.paramName === "email_address"
      ? "form_param_format_invalid__email_address"
      : code === "form_identifier_exists" && clerkErr.meta?.paramName === "email_address"
        ? "form_identifier_exists__email_address"
        : code;
  return (
    CLERK_ERROR_MESSAGES[key] ||
    clerkErr.longMessage ||
    clerkErr.message ||
    "Ocurrió un error inesperado. Inténtalo de nuevo."
  );
}
