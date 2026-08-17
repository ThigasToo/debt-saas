export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="glassBase" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#E9F7ED" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#BFE6C9" stopOpacity="0.35" />
        </radialGradient>

        <linearGradient
          id="ring"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#7DDB9B" />
          <stop offset="50%" stopColor="#22B14C" />
          <stop offset="100%" stopColor="#146B2E" />
        </linearGradient>

        <linearGradient
          id="leaf"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#6FDB92" />
          <stop offset="55%" stopColor="#22B14C" />
          <stop offset="100%" stopColor="#14913B" />
        </linearGradient>

        <linearGradient
          id="root"
          x1="32"
          y1="22"
          x2="32"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#18763A" />
          <stop offset="100%" stopColor="#0D4A20" />
        </linearGradient>
      </defs>

      {/* Fundo */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="url(#glassBase)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1"
      />

      {/* Círculo incompleto */}
      <path
        d="M32 6 A26 26 0 1 1 8.5 44"
        fill="none"
        stroke="url(#ring)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Reflexo */}
      <ellipse
        cx="21"
        cy="14"
        rx="9"
        ry="3"
        fill="#FFFFFF"
        opacity="0.3"
        transform="rotate(-20 21 14)"
      />

      {/* Folha superior */}
      <path
        d="
          M32 21
          C29 17 29 13 32 10
          C35 13 35 17 32 21
          Z
        "
        fill="url(#leaf)"
      />

      {/* Folha esquerda */}
      <path
        d="
          M31 27
          C25 26 21 22 20 17
          C26 18 30 21 31 27
          Z
        "
        fill="url(#leaf)"
      />

      {/* Folha direita */}
      <path
        d="
          M33 27
          C39 26 43 22 44 17
          C38 18 34 21 33 27
          Z
        "
        fill="url(#leaf)"
      />

      {/* Linha do solo */}
      <line
        x1="17"
        y1="31"
        x2="47"
        y2="31"
        stroke="#146B2E"
        strokeWidth="1"
        strokeDasharray="1.5 2.5"
        opacity="0.35"
      />

      {/* Caule central */}
      <path
        d="
          M32 22
          C32 25 32 28 32 31
          L32 39
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Raiz esquerda */}
      <path
        d="
          M32 36
          C28 38 25 42 23 47
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Raiz direita */}
      <path
        d="
          M32 36
          C36 38 39 42 41 47
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Raiz central */}
      <path
        d="
          M32 37
          C32 41 32 45 32 49
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Ramificação inferior esquerda */}
      <path
        d="
          M32 43
          C29 45 27 47 26 50
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Ramificação inferior direita */}
      <path
        d="
          M32 43
          C35 45 37 47 38 50
        "
        fill="none"
        stroke="url(#root)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}