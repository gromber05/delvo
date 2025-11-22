package com.gromber05.delvo.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(auth.currentUser != null)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _isRegistered = MutableStateFlow(false)
    val registered: StateFlow<Boolean> = _isRegistered

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
                _isRegistered.value = true
                _loading.value = false
            }
            .addOnFailureListener {
                _error.value = it.message
                _loading.value = false
            }
    }

    fun logout() {
        auth.signOut()
        _isLoggedIn.value = false
    }

    fun clearError() {
        _error.value = null
    }

    suspend fun getIdToken(): String {
        return try {
            val user = auth.currentUser ?: throw IllegalStateException("No hay usuario regsitrado")

            val tokenResult = user.getIdToken(true).await()
            return tokenResult.token ?: throw IllegalStateException("TOKEN nulo")
        } catch (e: IllegalStateException) {
            ""
        }
    }

    fun getUserToken() {
        viewModelScope.launch {
            val token = getIdToken()
            Log.d("FIREBASE_TOKEN", token)
        }
    }
}