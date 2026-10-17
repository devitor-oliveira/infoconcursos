// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../../renderer/src/components/search/SearchBar'
import { SearchFilter } from '../../shared/types/search'

describe('Componente SearchBar (Busca, Filtros e Conformidade LGPD)', () => {
  const defaultFilter: SearchFilter = {
    termoLivre: '',
    area: 'TODOS',
    uf: 'TODOS',
    statusFiltro: 'TODOS'
  }

  it('deve renderizar a barra de pesquisa e disparar busca ao submeter o formulário', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    const handleUpdate = vi.fn()

    render(
      <SearchBar
        filter={{ ...defaultFilter, termoLivre: 'TRT MG' }}
        isLoading={false}
        onUpdateFilter={handleUpdate}
        onSubmitSearch={handleSubmit}
      />
    )

    // 2. Act
    const botaoConsultar = screen.getByRole('button', { name: /consultar/i })
    await user.click(botaoConsultar)

    // 3. Assert
    expect(handleSubmit).toHaveBeenCalledTimes(1)
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ termoLivre: 'TRT MG' }),
      expect.objectContaining({ forceRefresh: false })
    )
  })

  it('deve emitir aviso de validação LGPD quando o usuário tentar submeter busca com CPF', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    const handleUpdate = vi.fn()
    const handleValidationWarning = vi.fn()

    render(
      <SearchBar
        filter={{ ...defaultFilter, termoLivre: '123.456.789-00' }}
        isLoading={false}
        onUpdateFilter={handleUpdate}
        onValidationWarning={handleValidationWarning}
        onSubmitSearch={handleSubmit}
      />
    )

    // 2. Act
    const botaoConsultar = screen.getByRole('button', { name: /consultar/i })
    await user.click(botaoConsultar)

    // 3. Assert: Disparou aviso de validação LGPD
    expect(handleValidationWarning).toHaveBeenCalled()
    const warningMsg = handleValidationWarning.mock.calls[0][0]
    expect(warningMsg).toContain('LGPD')
  })

  it('deve preencher o filtro e disparar busca ao clicar em uma sugestão rápida', async () => {
    // 1. Arrange
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    const handleUpdate = vi.fn()

    render(
      <SearchBar
        filter={defaultFilter}
        isLoading={false}
        onUpdateFilter={handleUpdate}
        onSubmitSearch={handleSubmit}
      />
    )

    // 2. Act: Clica na pílula de sugestão "Banco do Brasil"
    const chipBB = screen.getByRole('button', { name: /banco do brasil/i })
    await user.click(chipBB)

    // 3. Assert
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        termoLivre: 'Banco do Brasil',
        area: 'TODOS',
        uf: 'TODOS'
      })
    )
  })
})
