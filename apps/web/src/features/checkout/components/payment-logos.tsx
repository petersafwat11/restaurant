export function PaymentLogos() {
  return (
    <div className="flex items-center justify-center gap-4 opacity-60" aria-hidden>
      <svg height={14} viewBox="0 0 48 16" role="presentation">
        <title>Visa</title>
        <text
          x={0}
          y={13}
          fontFamily="Inter, sans-serif"
          fontWeight={800}
          fontSize={14}
          fontStyle="italic"
          fill="#1A1F71"
          letterSpacing="-0.02em"
        >
          VISA
        </text>
      </svg>
      <svg height={16} viewBox="0 0 30 18" role="presentation">
        <title>Mastercard</title>
        <circle cx={11} cy={9} r={7} fill="#EB001B" />
        <circle cx={19} cy={9} r={7} fill="#F79E1B" />
        <path d="M15 4a7 7 0 0 0 0 10 7 7 0 0 0 0-10Z" fill="#FF5F00" />
      </svg>
      <svg height={14} viewBox="0 0 36 16" role="presentation">
        <title>BLIK</title>
        <text
          x={0}
          y={13}
          fontFamily="Inter, sans-serif"
          fontWeight={800}
          fontSize={14}
          fill="#000"
        >
          BLIK
        </text>
      </svg>
    </div>
  );
}
