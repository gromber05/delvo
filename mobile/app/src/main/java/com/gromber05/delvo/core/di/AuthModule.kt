package com.gromber05.delvo.core.di

import com.gromber05.delvo.domain.repository.AuthRepository
import com.gromber05.delvo.data.repository.AuthService
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        impl: AuthService
    ): AuthRepository
}
