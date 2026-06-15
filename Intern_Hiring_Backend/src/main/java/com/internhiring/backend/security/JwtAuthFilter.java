package com.internhiring.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final SupabaseTokenVerificationService tokenVerificationService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isPublicRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String jwt = parseJwt(request);
            if (jwt != null) {
                Claims claims = tokenVerificationService.verifyToken(jwt);
                
                String supabaseId = claims.getSubject(); // 'sub' claim
                String email = claims.get("email", String.class);
                
                // Try to load user from local DB using supabase_id (uuid)
                // Fallback to email if needed
                UserDetails userDetails = null;
                try {
                    userDetails = userDetailsService.loadUserBySupabaseId(supabaseId);
                } catch (Exception e) {
                    log.warn("User with supabase_id {} not found locally, attempting email lookup", supabaseId);
                    userDetails = userDetailsService.loadUserByUsername(email);
                }

                List<SimpleGrantedAuthority> authorities = userDetails.getAuthorities().stream()
                        .map(auth -> new SimpleGrantedAuthority(auth.getAuthority()))
                        .toList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                if (userDetails instanceof AuthenticatedUser authUser && !authUser.isAccountNonLocked() && !authUser.isAdmin()) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Account is restricted\"}");
                    return;
                }

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private boolean isPublicRequest(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getServletPath();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        if (path.startsWith("/api/auth/") || "/api/health".equals(path)) {
            return true;
        }

        if (!"GET".equalsIgnoreCase(method)) {
            return false;
        }

        return "/api/site-config".equals(path)
                || "/api/jobs".equals(path)
                || "/api/recruiter/form-fields".equals(path)
                || path.startsWith("/api/categories/");
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
