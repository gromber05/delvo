package com.gromber05.delvo.ui.screens.registerscreen

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gromber05.delvo.domain.model.User
import com.gromber05.delvo.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.*
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _registered = MutableStateFlow(false)
    val registered: StateFlow<Boolean> = _registered

    fun register(user: User) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            _registered.value = false

            val result = authRepository.register(user)

            result
                .onSuccess {
                    _registered.value = true
                }
                .onFailure { e ->
                    _error.value = e.message
                }

            _loading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }
}
