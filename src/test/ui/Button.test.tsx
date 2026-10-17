// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../renderer/src/components/ds/atoms/Button'

describe('Componente Button (Design System Atoms)', () => {
  it('deve disparar o manipulador onClick quando acionado por clique do usuário', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    let clicou = false
    const handleClick = vi.fn(() => {
      clicou = true
    })

    // 2. Act
    render(<Button onClick={handleClick}>Acompanhar Concurso</Button>)
    const botao = screen.getByRole('button', { name: /acompanhar concurso/i })
    expect(botao).toBeInTheDocument()

    await user.click(botao)

    // 3. Assert
    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(clicou).toBe(true)
  })

  it('não deve disparar onClick nem receber foco ativo quando disabled for true', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    const handleClick = vi.fn()

    // 2. Act
    render(
      <Button disabled onClick={handleClick}>
        Operação Bloqueada
      </Button>
    )
    const botao = screen.getByRole('button', { name: /operação bloqueada/i })

    // 3. Assert
    expect(botao).toBeDisabled()
    await user.click(botao)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('deve desabilitar o botão e exibir estado de carregamento quando isLoading for true', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    const handleClick = vi.fn()

    // 2. Act
    render(
      <Button isLoading onClick={handleClick}>
        Pesquisando
      </Button>
    )
    const botao = screen.getByRole('button', { name: /pesquisando/i })

    // 3. Assert
    expect(botao).toBeDisabled()
    await user.click(botao)
    expect(handleClick).not.toHaveBeenCalled()
  })
})
