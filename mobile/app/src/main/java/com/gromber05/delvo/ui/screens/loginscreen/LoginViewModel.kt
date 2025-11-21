package com.gromber05.delvo.ui.screens.loginscreen

import android.util.Log
import androidx.lifecycle.ViewModel
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(auth.currentUser != null)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    fun login(email: String, password: String) {
        _loading.value = true
        auth.signInWithEmailAndPassword(email.trim(), password)
            .addOnSuccessListener {
                _isLoggedIn.value = true
                _loading.value = false
            }
            .addOnFailureListener { e ->
                _loading.value = false
                _isLoggedIn.value = false

                _error.value = e.message

                Log.e("LoginViewModel", "Error al iniciar sesión", e)

                if (e is FirebaseAuthException) {
                    Log.e("LoginViewModel", "FirebaseAuth errorCode = ${e.errorCode}")
                }
            }
    }


    fun register(email: String, password: String) {
        _loading.value = true
        auth.createUserWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                _isLoggedIn.value = true
                _loading.value = false
                // loadCategorias()
                // loadProductos()
            }
            .addOnFailureListener {
                _error.value = it.message
                _loading.value = false
            }
    }

    fun logout() {
        auth.signOut()
        _isLoggedIn.value = false
        // _categorias.value = emptyList()
        // _productos.value = emptyList()
    }

    fun clearError() {
        _error.value = null
    }

}