package com.gromber05.delvo.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gromber05.delvo.data.repository.AuthRepository
import com.gromber05.delvo.domain.model.SessionUser
import com.gromber05.delvo.domain.model.User
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(authRepository.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _isRegistered = MutableStateFlow(false)
    val registered: StateFlow<Boolean> = _isRegistered

    private val _currentUser = MutableStateFlow<SessionUser?>(null)
    val currentUser: StateFlow<SessionUser?> = _currentUser

    init {
        viewModelScope.launch {
            authRepository.getCachedUser().collect { user ->
                _currentUser.value = user
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null

            val result = authRepository.login(email, password)

            result
                .onSuccess {
                    _isLoggedIn.value = true
                }
                .onFailure { e ->
                    _isLoggedIn.value = false
                    _error.value = e.message
                    Log.e("AuthViewModel", "Error al iniciar sesión", e)
                }

            _loading.value = false
        }
    }

    fun register(user: User) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null

            val result = authRepository.register(user)

            result
                .onSuccess {
                    _isLoggedIn.value = true
                    _isRegistered.value = true
                }
                .onFailure { e ->
                    _error.value = e.message
                    Log.e("AuthViewModel", "Error al registrar usuario", e)
                }

            _loading.value = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _isLoggedIn.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }
}
