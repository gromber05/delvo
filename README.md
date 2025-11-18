# 🧠 Delvo - Asistente Personal Inteligente Multiplataforma

Delvo consiste en el desarrollo de un **Asistente Personal Inteligente**, diseñado para ayudar a los usuarios a organizar su día a día mediante la gestión de tareas, recordatorios, eventos, notas y rutinas.  
Incluye **Aplicación Móvil**, **Aplicación Web** y **Backend**, además de un módulo de **Inteligencia Artificial** que mejora la toma de decisiones del usuario.

Este sistema pretende combinar productividad, simplicidad y automatización de rutinas mediante IA, integrando datos entre plataformas de forma segura.

---

## 🚀 Características principales

### 🔹 Aplicación Móvil
- Vista *“Hoy”* con recomendaciones generadas por IA  
- Lista de tareas con prioridades y categorías  
- Creación rápida de tareas por texto  
- Notas rápidas  
- Recordatorios inteligentes  
- Navegación inferior (Hoy, Tareas, Calendario, Perfil)  
- Sincronización con backend en tiempo real

---

### 🔹 Aplicación Web
- Dashboard principal de productividad  
- Estadísticas y gráficas: tareas completadas, hábitos, rachas  
- Calendario semanal/mensual  
- Gestor avanzado de tareas  
- Panel de notas  
- Resúmenes semanales generados por IA  
- Configuraciones del perfil y ajustes de IA

---

### 🔹 Backend
- API REST para móvil y web  
- Seguridad con JWT  
- Gestión de usuarios, tareas, notas, recordatorios y rutinas  
- PostgreSQL como base de datos  
- Sincronización entre dispositivos  
- Servicio de IA integrado  
- Generador de resúmenes y sugerencias

---

### 🤖 Módulo IA
El asistente cuenta con varias funciones inteligentes:

- **Clasificación automática de tareas**  
  La IA detecta categoría, prioridad y fecha sugerida según la descripción.

- **Organización semanal inteligente**  
  Sugiere un planning según hábitos del usuario.

- **Resumen diario/semanal**  
  Informa al usuario sobre su productividad y recomendaciones.

- **Detección de patrones y hábitos**  
  Identifica momentos del día donde el usuario rinde más.

- **Recordatorios inteligentes**  
  Basados en contexto y comportamiento.

---

## 🧱 Arquitectura del proyecto

La estructura del repositorio sigue un formato **monorepo**, donde cada módulo se encuentra dentro de su propia carpeta:

````

delvo/
│
├─ backend/              # Proyecto Spring Boot + Kotlin
│
├─ mobile/               # Aplicación Android (Jetpack Compose)
│
├─ web/                  # Aplicación Web (Angular o React)
│
└─ docs/                 # Documentación, diagramas, memoria, presentación

````

---

## 🛠️ Tecnologías utilizadas

![Kotlin](https://img.shields.io/badge/Kotlin-764ABC?style=for-the-badge&logo=kotlin&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-6db33f?style=for-the-badge&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-4285F4?style=for-the-badge&logo=jetpackcompose&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)


---

## 📊 Flujo general del sistema

1. El usuario crea tareas/notas/eventos desde móvil o web  
2. El backend procesa la información y actualiza la BD  
3. El módulo IA analiza comportamiento y genera sugerencias  
4. Las apps muestran recomendaciones personalizadas  
5. La web ofrece un dashboard avanzado con datos históricos  

---

## 📄 Documentación

La carpeta `docs/` contiene:

- Índice de la memoria  
- Diagramas de arquitectura  
- Diagramas UML  
- Esquemas de la BD  
- Prototipos y mockups  
- Guía de instalación  
- Información para el tribunal del TFG  

---

## 🧪 Tests
- Tests unitarios en backend  
- Tests de UI en móvil (opcional)  
- Tests de componentes en web  

---

## 🧩 Instalación y ejecución

### 1. Backend
```bash
cd backend
./gradlew bootRun
```

### 2. Aplicación Web

```bash
cd web
npm install
npm start
```

### 3. Aplicación Móvil

Abrir `mobile/` en Android Studio y ejecutar.

---

## 👤 Autor

### **Gonzalo Romero Bernal**  
Estudiante de 2º DAM — IES Rafael Alberti

---

## ⭐ Agradecimientos

*

