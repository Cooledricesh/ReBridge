import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // 보호된 경로 설정
        const protectedPaths = ["/profile", "/settings", "/saved-jobs"]
        const pathname = req.nextUrl.pathname
        
        // 보호된 경로인 경우 토큰 확인
        if (protectedPaths.some(path => pathname.startsWith(path))) {
          return !!token
        }
        
        // 그 외의 경로는 모두 허용
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
}