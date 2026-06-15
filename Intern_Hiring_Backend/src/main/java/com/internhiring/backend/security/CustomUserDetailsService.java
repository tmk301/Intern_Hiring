package com.internhiring.backend.security;

import com.internhiring.backend.entity.User;
import com.internhiring.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with email: " + email));
        return new AuthenticatedUser(user);
    }

    @Transactional
    public UserDetails loadUserBySupabaseId(String supabaseIdStr) throws UsernameNotFoundException {
        UUID supabaseId = UUID.fromString(supabaseIdStr);
        User user = userRepository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with supabase_id: " + supabaseIdStr));
        return new AuthenticatedUser(user);
    }
}
