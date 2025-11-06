package com.gromber05.delvo

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel // Para obtener el ViewModel
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gromber05.delvo.ui.navigation.AppScreens
import com.gromber05.delvo.ui.screens.HomeScreen
import com.gromber05.delvo.ui.screens.LoginScreen
import com.gromber05.delvo.ui.theme.DelvoTheme
import com.gromber05.delvo.viewmodel.MainViewModel


@Composable
fun DelvoApp(
    viewModel: MainViewModel = viewModel()
) {
    DelvoTheme {
        val isLoggedIn by viewModel.isUserLoggedIn.observeAsState(initial = false)
        val navController = rememberNavController()

        val startDestination = if (isLoggedIn == true) {
            AppScreens.HomeScreen
        } else {
            AppScreens.LoginScreen
        }

        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            composable(AppScreens.LoginScreen.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(AppScreens.HomeScreen) {
                            popUpTo(AppScreens.LoginScreen) { inclusive = true }
                        }
                        viewModel.handleSuccessfulLogin()
                    },
                    onLoginError = {

                    }
                )
            }

            composable(AppScreens.HomeScreen.route) {
                HomeScreen(
                    onLogout = {
                        navController.navigate(AppScreens.LoginScreen) {
                            popUpTo(AppScreens.HomeScreen) { inclusive = true }
                        }
                        viewModel.logout()
                    }
                )
            }
        }
    }
}
