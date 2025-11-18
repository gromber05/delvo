package com.gromber05.delvo.domain.model

enum class Roles(val label: String) {
    USER("Usuario"), ADMIN("Administrador");

    override fun toString(): String {
        return label
    }

    fun obtainRol(rol: String): Roles? {
        return when (rol) {
            "Usuario" -> USER
            "Administrador" -> ADMIN
            else -> null
        }
    }
}