package com.gromber05.delvo

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.livedata.observeAsState
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gromber05.delvo.ui.navigation.AppScreens
import com.gromber05.delvo.ui.screens.ForgotPasswordScreen
import com.gromber05.delvo.ui.screens.HomeScreen
import com.gromber05.delvo.ui.screens.LoginScreen
import com.gromber05.delvo.ui.screens.RegisterScreen
import com.gromber05.delvo.ui.theme.DelvoTheme

@Composable
fun DelvoApp() {
    DelvoTheme {
        val navController = rememberNavController()
        val startDestination = AppScreens.LoginScreen.route
        val context = LocalContext.current


        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            composable(AppScreens.LoginScreen.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(AppScreens.HomeScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    },
                    onLoginError = {
                        Toast.makeText(context, "Error de inicio de sesión", Toast.LENGTH_SHORT).show()
                    },
                    toRegister = {
                        navController.navigate(AppScreens.RegisterScreen.route)
                    },
                    toForgotPassword = {
                        navController.navigate(AppScreens.ForgotScreen.route)
                    },
                    modifier = Modifier
                )
            }

            composable(AppScreens.HomeScreen.route) {
                HomeScreen(
                    onLogout = {
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
