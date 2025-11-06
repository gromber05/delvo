package com.gromber05.delvo.ui.navigation

sealed class AppScreens(val route: String) {
    object HomeScreen: AppScreens("home_screen")
    object LoginScreen: AppScreens(route = "login_screen")
}