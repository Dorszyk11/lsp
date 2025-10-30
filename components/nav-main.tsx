"use client"

import Link from "next/link"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-4 pt-6">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild className="group relative py-4">
                <Link href={item.url} className="flex items-center gap-4 w-full">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E61E1E] opacity-0 group-hover:opacity-100 group-data-[active=true]:opacity-100 transition-opacity" />
                  {item.icon && <item.icon className="size-7" />}
                  <span className="text-xl font-semibold">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
