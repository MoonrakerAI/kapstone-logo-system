// Vercel Edge Middleware to bypass authentication for public routes
export function middleware(request) {
  const url = request.nextUrl.clone();
  
  // Allow public access to widget and logo endpoints
  if (url.pathname.startsWith('/widget/') || 
      url.pathname.startsWith('/logos/') ||
      url.pathname.startsWith('/api/widget/')) {
    
    // Remove any auth headers that might block the request
    const response = NextResponse.next();
    response.headers.delete('authorization');
    return response;
  }
}

export const config = {
  matcher: ['/widget/:path*', '/logos/:path*', '/api/widget/:path*']
};