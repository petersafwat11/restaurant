export function PaymentLogos() {
  return (
    <div className="flex items-center justify-center gap-4 opacity-60" aria-hidden>
      <svg height={14} viewBox="0 0 48 16">
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
      <svg height={16} viewBox="0 0 30 18">
        <circle cx={11} cy={9} r={7} fill="#EB001B" />
        <circle cx={19} cy={9} r={7} fill="#F79E1B" />
        <path d="M15 4a7 7 0 0 0 0 10 7 7 0 0 0 0-10Z" fill="#FF5F00" />
      </svg>
      <svg height={14} viewBox="0 0 36 16">
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
      <svg height={14} viewBox="0 0 42 16">
        <path
          d="M7.5 4.2c.4-.5.7-1.1.6-1.7-.5 0-1.1.4-1.5.8-.4.4-.7 1-.6 1.7.6 0 1.1-.3 1.5-.8ZM8 5.5c-.8 0-1.5.4-1.9.4-.4 0-1-.4-1.7-.4C3.4 5.6 2.4 6.5 2.4 8.4c0 1.2.4 2.4.9 3.1.4.6 1 1.4 1.6 1.4.6 0 .9-.4 1.7-.4.8 0 1 .4 1.7.4.7 0 1.1-.7 1.6-1.3.4-.6.7-1.3.8-1.8-1.2-.5-1.6-2-1.6-2C7.9 6.4 7 6.1 7 6.1Z"
          fill="#000"
        />
        <text
          x={13}
          y={12}
          fontFamily="Inter, sans-serif"
          fontWeight={600}
          fontSize={11}
          fill="#000"
        >
          Pay
        </text>
      </svg>
    </div>
  );
}
