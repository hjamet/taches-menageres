package com.henrijamet.tachesmenageres

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Preview(showBackground = true, widthDp = 412, heightDp = 892)
@Composable
fun TachesMenageresHomeScreenPreview() {
    val bgPrimary = Color(0xFF0F172A)
    val bgSurface = Color(0xFF111827)
    val bgCard = Color(0xFF1E293B)
    val borderColor = Color(0xFF334155)
    val textMain = Color(0xFFF8FAFC)
    val textMuted = Color(0xFF94A3B8)
    val textDim = Color(0xFF64748B)
    val accentEmeraldStart = Color(0xFF059669)
    val accentEmeraldMid = Color(0xFF10B981)
    val accentEmeraldEnd = Color(0xFF34D399)
    val accentHenri = Color(0xFF3B82F6)
    val accentHenriLight = Color(0xFF60A5FA)

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = bgPrimary
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // En-tête de l'application
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(bgSurface)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "🏠",
                        fontSize = 20.sp
                    )
                    Text(
                        text = "Tâches Ménagères",
                        color = textMain,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Pastille Profil actif
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(9999.dp))
                        .background(accentHenri.copy(alpha = 0.15f))
                        .border(1.dp, accentHenri, RoundedCornerShape(9999.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(text = "👤", fontSize = 13.sp)
                        Text(
                            text = "Henri",
                            color = accentHenriLight,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "▾",
                            color = textDim,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Contenu central : Chronomètre et actions
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceEvenly
            ) {
                Spacer(modifier = Modifier.height(8.dp))

                // Gros bouton rond central émeraude (210dp)
                Box(
                    modifier = Modifier
                        .size(210.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(accentEmeraldStart, accentEmeraldMid, accentEmeraldEnd)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "▶",
                            color = Color.White,
                            fontSize = 32.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "00:00:00",
                            color = Color.White,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "DÉMARRER",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp
                        )
                    }
                }

                // Statut et profil actif
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(9999.dp))
                            .background(bgCard)
                            .border(1.dp, borderColor, RoundedCornerShape(9999.dp))
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = "●", color = accentEmeraldMid, fontSize = 10.sp)
                            Text(
                                text = "Prêt à démarrer",
                                color = textMain,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    Text(
                        text = "Profil actif : Henri",
                        color = textMuted,
                        fontSize = 12.sp
                    )
                }

                // Bouton Saisie Manuelle
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(bgCard)
                        .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                        .padding(vertical = 12.dp, horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "＋ Saisie manuelle d'une tâche passée",
                        color = textMain,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                // Aperçu Pièces et Tags
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Pièces & Tâches suggérées",
                        color = textMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(bgCard)
                                .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                                .padding(vertical = 8.dp, horizontal = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "🍳 Cuisine",
                                color = textMain,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(bgCard)
                                .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                                .padding(vertical = 8.dp, horizontal = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "🛋️ Salon",
                                color = textMain,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(bgCard)
                                .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                                .padding(vertical = 8.dp, horizontal = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "🚿 Salle de bain",
                                color = textMain,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
            }

            // Barre de navigation inférieure (Bottom Nav)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .background(bgSurface)
                    .border(width = 1.dp, color = borderColor)
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(text = "⏱️", fontSize = 18.sp)
                    Text(
                        text = "Timer",
                        color = accentHenriLight,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(text = "📊", fontSize = 18.sp)
                    Text(
                        text = "Bilan",
                        color = textDim,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(text = "📁", fontSize = 18.sp)
                    Text(
                        text = "Journal",
                        color = textDim,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
