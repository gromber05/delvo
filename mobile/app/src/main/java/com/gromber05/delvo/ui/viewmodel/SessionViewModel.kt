package com.gromber05.delvo.ui.viewmodel

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class SessionViewModel @Inject constructor(): ViewModel() {

    private val _isAdmin = MutableStateFlow(false)
    val isAdmin: StateFlow<Boolean> = _isAdmin
    private val _uid = MutableStateFlow<String?>(null)
    val uid = _uid

    fun updateSession(uid: String, isAdmin: Boolean) {
        _uid.value = uid
        _isAdmin.value = isAdmin
    }

    fun clearSession() {
        _uid.value = null
        _isAdmin.value = false
    }
}