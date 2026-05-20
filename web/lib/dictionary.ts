import { normalizeLanguage, type SupportedLanguage } from "@/lib/language"

type UiDictionary = {
  auth: {
    loginTitle: string
    noAccount: string
    createAccount: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    loginSubmitting: string
    loginButton: string
    loginError: string
    signupTitle: string
    hasAccount: string
    loginLink: string
    nameLabel: string
    namePlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    passwordMismatch: string
    passwordMinLength: string
    signupSubmitting: string
    signupButton: string
    signupError: string
  }
  common: {
    or: string
    continueWithApple: string
    continueWithGoogle: string
    tosPrefix: string
    tos: string
    and: string
    privacy: string
  }
  nav: {
    logoutSuccess: string
    logout: string
    upgrade: string
    account: string
    billing: string
    notifications: string
  }
  chat: {
    welcome: string
    subtitle: string
    typing: string
    inputPlaceholder: string
    noModelResponse: string
    assistantError: string
    unexpectedError: string
  }
  dashboard: {
    weekDays: string[]
    dateLocale: string
    monthTasks: string
    pending: string
    activeDays: string
    calendar: string
    calendarHint: string
    taskSingular: string
    taskPlural: string
    todayAgenda: string
    noTasksToday: string
    dayTasksTitle: string
    close: string
    noTasksForDay: string
    noTime: string
  }
  sidebar: {
    sectionLabel: string
    home: string
    planner: string
    calendar: string
    settings: string
    tagline: string
  }
}

export const dictionary: Record<SupportedLanguage, UiDictionary> = {
  es: {
    auth: {
      loginTitle: "Bienvenido a Delvo",
      noAccount: "¿No tienes cuenta?",
      createAccount: "Crear cuenta",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "Escribe aquí tu correo electrónico...",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Escribe aquí tu contraseña...",
      loginSubmitting: "Iniciando sesión...",
      loginButton: "Iniciar sesión",
      loginError: "No se pudo iniciar sesión. Inténtalo de nuevo.",
      signupTitle: "Crea tu cuenta en Delvo",
      hasAccount: "¿Ya tienes una cuenta?",
      loginLink: "Iniciar sesión",
      nameLabel: "Nombre",
      namePlaceholder: "Escribe aquí tu nombre...",
      confirmPasswordLabel: "Confirmar contraseña",
      confirmPasswordPlaceholder: "Confirma aquí tu contraseña...",
      passwordMismatch: "Las contraseñas no coinciden",
      passwordMinLength: "La contraseña debe tener al menos 8 caracteres",
      signupSubmitting: "Creando cuenta...",
      signupButton: "Crear cuenta",
      signupError: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    },
    common: {
      or: "O",
      continueWithApple: "Continuar con Apple",
      continueWithGoogle: "Continuar con Google",
      tosPrefix: "Al hacer clic en continuar, aceptas nuestros",
      tos: "Términos de servicio",
      and: "y",
      privacy: "Política de privacidad",
    },
    nav: {
      logoutSuccess: "Sesión cerrada",
      logout: "Cerrar sesión",
      upgrade: "Actualizar a premium",
      account: "Cuenta",
      billing: "Facturación",
      notifications: "Notificaciones",
    },
    chat: {
      welcome:
        "Hola, soy Stella, tu asistente del día a día. Estoy aquí para ayudarte a organizar tareas, eventos y reuniones. Cuéntame en qué te ayudo hoy.",
      subtitle: "Tu asistente personal inteligente",
      typing: "Stella está escribiendo...",
      inputPlaceholder: "Habla con tu asistente...",
      noModelResponse: "No hubo respuesta del modelo.",
      assistantError: "No se pudo obtener respuesta del asistente.",
      unexpectedError: "Ha ocurrido un error inesperado.",
    },
    dashboard: {
      weekDays: ["L", "M", "X", "J", "V", "S", "D"],
      dateLocale: "es-ES",
      monthTasks: "Tareas del mes",
      pending: "Pendientes",
      activeDays: "Días con actividad",
      calendar: "Calendario",
      calendarHint: "Pulsa un día para ver las tareas programadas.",
      taskSingular: "tarea",
      taskPlural: "tareas",
      todayAgenda: "Agenda de hoy",
      noTasksToday: "No tienes tareas para hoy.",
      dayTasksTitle: "Tareas del día",
      close: "Cerrar",
      noTasksForDay: "No hay tareas para este día.",
      noTime: "Sin hora",
    },
    sidebar: {
      sectionLabel: "Resumen",
      home: "Inicio",
      planner: "Planner",
      calendar: "Calendario",
      settings: "Ajustes",
      tagline: "Tu asistente personal.",
    },
  },
  en: {
    auth: {
      loginTitle: "Welcome to Delvo",
      noAccount: "No account yet?",
      createAccount: "Create account",
      emailLabel: "Email",
      emailPlaceholder: "Type your email here...",
      passwordLabel: "Password",
      passwordPlaceholder: "Type your password here...",
      loginSubmitting: "Signing in...",
      loginButton: "Sign in",
      loginError: "Could not sign in. Please try again.",
      signupTitle: "Create your Delvo account",
      hasAccount: "Already have an account?",
      loginLink: "Sign in",
      nameLabel: "Name",
      namePlaceholder: "Type your name here...",
      confirmPasswordLabel: "Confirm password",
      confirmPasswordPlaceholder: "Confirm your password here...",
      passwordMismatch: "Passwords do not match",
      passwordMinLength: "Password must be at least 8 characters",
      signupSubmitting: "Creating account...",
      signupButton: "Create account",
      signupError: "Could not create account. Please try again.",
    },
    common: {
      or: "OR",
      continueWithApple: "Continue with Apple",
      continueWithGoogle: "Continue with Google",
      tosPrefix: "By continuing, you agree to our",
      tos: "Terms of service",
      and: "and",
      privacy: "Privacy policy",
    },
    nav: {
      logoutSuccess: "Signed out",
      logout: "Sign out",
      upgrade: "Upgrade to premium",
      account: "Account",
      billing: "Billing",
      notifications: "Notifications",
    },
    chat: {
      welcome:
        "Hi, I am Stella, your day to day assistant. I am here to help you organize tasks, events, and meetings. Tell me how I can help today.",
      subtitle: "Your smart personal assistant",
      typing: "Stella is typing...",
      inputPlaceholder: "Talk to your assistant...",
      noModelResponse: "The model did not return a response.",
      assistantError: "Could not get a response from the assistant.",
      unexpectedError: "An unexpected error occurred.",
    },
    dashboard: {
      weekDays: ["M", "T", "W", "T", "F", "S", "S"],
      dateLocale: "en-US",
      monthTasks: "Tasks this month",
      pending: "Pending",
      activeDays: "Active days",
      calendar: "Calendar",
      calendarHint: "Tap a day to see scheduled tasks.",
      taskSingular: "task",
      taskPlural: "tasks",
      todayAgenda: "Today's agenda",
      noTasksToday: "You have no tasks for today.",
      dayTasksTitle: "Tasks for",
      close: "Close",
      noTasksForDay: "There are no tasks for this day.",
      noTime: "No time",
    },
    sidebar: {
      sectionLabel: "Overview",
      home: "Home",
      planner: "Planner",
      calendar: "Calendar",
      settings: "Settings",
      tagline: "Your personal assistant.",
    },
  },
}

export function getDictionary(language: string | null | undefined): UiDictionary {
  const normalized = normalizeLanguage(language)
  return dictionary[normalized] ?? dictionary.es
}

