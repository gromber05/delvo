package com.gromber05.delvo

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.livedata.observeAsState
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gromber05.delvo.ui.navigation.AppScreens
import com.gromber05.delvo.ui.screens.ForgotPasswordScreen
import com.gromber05.delvo.ui.screens.HomeScreen
import com.gromber05.delvo.ui.screens.LoginScreen
import com.gromber05.delvo.ui.screens.RegisterScreen
import com.gromber05.delvo.ui.theme.DelvoTheme
import com.gromber05.delvo.viewmodel.MainViewModel

@Composable
fun DelvoApp(
    viewModel: MainViewModel = viewModel()
) {
    DelvoTheme {
        val navController = rememberNavController()
        val startDestination = "root" // Ruta de inicio FIJA
        val context = LocalContext.current

        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            // 1. RUTA RAÍZ: Su único trabajo es decidir a dónde ir.
            composable(startDestination) {
                val isLoggedIn by viewModel.isUserLoggedIn.observeAsState()

                // Determina la ruta correcta basándose en el estado de login
                val route = if (isLoggedIn == true) AppScreens.HomeScreen.route else AppScreens.LoginScreen.route

                // Navega a la ruta decidida y BORRA la ruta "root" de la pila
                navController.navigate(route) {
                    popUpTo(startDestination) { inclusive = true }
                }
            }

            // 2. PANTALLA DE LOGIN
            composable(AppScreens.LoginScreen.route) {
                LoginScreen(
                    onLoginSuccess = {
                        viewModel.handleSuccessfulLogin()
                        // Navega a Home y limpia TODA la pila anterior hasta la raíz
                        navController.navigate(AppScreens.HomeScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    },
                    onLoginError = {
                        Toast.makeText(context, "Error de inicio de sesión", Toast.LENGTH_SHORT).show()
                    },
                    toRegister = {
                        // Simplemente navega a la pantalla de registro
                        navController.navigate(AppScreens.RegisterScreen.route)
                    },
                    toForgotPassword = {
                        // Simplemente navega a la pantalla de olvidar contraseña
                        navController.navigate(AppScreens.ForgotScreen.route)
                    },
                    viewModel = viewModel,
                    modifier = Modifier
                )
            }

            // 3. PANTALLA PRINCIPAL (HOME)
            composable(AppScreens.HomeScreen.route) {
                HomeScreen(
                    onLogout = {
                        viewModel.logout()
                        // Navega a Login y limpia TODA la pila anterior hasta la raíz
                        navController.navigate(AppScreens.LoginScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    }
                )
            }

            composable(AppScreens.RegisterScreen.route) {
                RegisterScreen(
                    onNavigateToLogin = {
                        navController.popBackStack()
                    },
                    onRegistrationSuccess = {
                        // Aquí podrías navegar al login o directamente al home si el registro es exitoso
                        Toast.makeText(context, "Registro exitoso", Toast.LENGTH_SHORT).show()
                        navController.popBackStack()
                    }
                )
            }

            composable(AppScreens.ForgotScreen.route) {
                ForgotPasswordScreen(
                    onNavigateToLogin = {
                        navController.popBackStack()
                    },
                    onSubmitResetRequest = {
                        Toast.makeText(context, "Solicitud enviada", Toast.LENGTH_SHORT).show()
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
