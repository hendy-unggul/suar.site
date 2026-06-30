import { supabase } from '@/lib/supabase'
import { colorPalettes } from '@/config/colorPalettes'
import { religionLayers } from '@/config/religionLayer'
import LayoutMontessori from '@/components/LayoutMontessori'
import LayoutReggio from '@/components/LayoutReggio'
import LayoutWaldorf from '@/components/LayoutWaldorf'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ sekolah: string }>
}

export default async function SchoolLandingPage({ params }: Props) {
  const { sekolah: slug } = await params

  const { data: school, error } = await supabase
    .from('schools')
    .select('name, slug, layout_structure, color_palette, religion_layer')
    .eq('slug', slug)
    .single()

  if (error || !school) {
    notFound()
  }

  const colors = colorPalettes[school.color_palette] ?? colorPalettes.palette_1
  const religion = religionLayers[school.religion_layer ?? 'umum']

  switch (school.layout_structure) {
    case 'reggio':
      return <LayoutReggio schoolName={school.name} colors={colors} religion={religion} />
    case 'waldorf':
      return <LayoutWaldorf schoolName={school.name} colors={colors} religion={religion} />
    case 'montessori':
    default:
      return <LayoutMontessori schoolName={school.name} colors={colors} religion={religion} />
  }
}