#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据聚合脚本
功能: 对清洗后的数据进行聚合统计，生成可视化所需的JSON文件
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

# 配置路径
BASE_DIR = Path(__file__).parent.parent
PROCESSED_DATA_PATH = BASE_DIR / "data" / "processed"
INPUT_FILE = PROCESSED_DATA_PATH / "cleaned_data.csv"


def aggregate_city_statistics(df):
    """城市级别数据聚合"""
    print("\n聚合城市统计数据...")
    
    city_stats = df.groupby('city').agg({
        'JobTitle': 'count',  # 招聘数量
        'salary_avg': ['mean', 'median', 'std'],  # 薪资统计
        'annual_salary': ['mean', 'median'],  # 年薪统计
        'company': 'nunique',  # 企业数量
        'companyType': 'nunique',  # 行业数量
        'experience_level': 'mean',  # 平均经验要求
        'education_level': 'mean'  # 平均学历要求
    }).reset_index()
    
    # 扁平化列名
    city_stats.columns = ['city', 'job_count', 'salary_mean', 'salary_median', 
                          'salary_std', 'annual_salary_mean', 'annual_salary_median',
                          'company_count', 'industry_count', 'avg_experience', 'avg_education']
    
    # 转换为字典列表
    city_data = city_stats.to_dict('records')
    
    # 保存
    output_file = PROCESSED_DATA_PATH / "city_statistics.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(city_data, f, ensure_ascii=False, indent=2)
    
    print(f"   已保存 {len(city_data)} 个城市的统计数据")
    return city_data


def aggregate_industry_statistics(df):
    """行业级别数据聚合"""
    print("\n聚合行业统计数据...")
    
    industry_stats = df.groupby('companyType').agg({
        'JobTitle': 'count',
        'salary_avg': ['mean', 'median'],
        'annual_salary': 'mean',
        'company': 'nunique',
        'experience_level': 'mean',
        'education_level': 'mean'
    }).reset_index()
    
    industry_stats.columns = ['industry', 'job_count', 'salary_mean', 
                              'salary_median', 'annual_salary_mean',
                              'company_count', 'avg_experience', 'avg_education']
    
    # 排序（按招聘数量）
    industry_stats = industry_stats.sort_values('job_count', ascending=False)
    
    industry_data = industry_stats.to_dict('records')
    
    output_file = PROCESSED_DATA_PATH / "industry_statistics.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(industry_data, f, ensure_ascii=False, indent=2)
    
    print(f"   已保存 {len(industry_data)} 个行业的统计数据")
    return industry_data


def aggregate_salary_analysis(df):
    """薪资分析数据"""
    print("\n聚合薪资分析数据...")
    
    # 过滤掉缺失值
    df_salary = df[df['salary_avg'].notna()].copy()
    
    salary_data = {
        "overall": {
            "min": float(df_salary['salary_avg'].min()),
            "max": float(df_salary['salary_avg'].max()),
            "mean": float(df_salary['salary_avg'].mean()),
            "median": float(df_salary['salary_avg'].median()),
            "std": float(df_salary['salary_avg'].std()),
            "q25": float(df_salary['salary_avg'].quantile(0.25)),
            "q75": float(df_salary['salary_avg'].quantile(0.75))
        },
        "by_education": [],
        "by_experience": [],
        "distribution": []
    }
    
    # 按学历统计
    for edu_level in sorted(df_salary['education_level'].unique()):
        if edu_level >= 0:  # 排除未知
            edu_data = df_salary[df_salary['education_level'] == edu_level]
            salary_data["by_education"].append({
                "level": int(edu_level),
                "count": int(len(edu_data)),
                "mean": float(edu_data['salary_avg'].mean()),
                "median": float(edu_data['salary_avg'].median())
            })
    
    # 按经验统计
    for exp_level in sorted(df_salary['experience_level'].unique()):
        if exp_level >= 0:  # 排除未知
            exp_data = df_salary[df_salary['experience_level'] == exp_level]
            salary_data["by_experience"].append({
                "level": int(exp_level),
                "count": int(len(exp_data)),
                "mean": float(exp_data['salary_avg'].mean()),
                "median": float(exp_data['salary_avg'].median())
            })
    
    # 薪资分布（分箱统计）
    bins = [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000]
    labels = ['0-5K', '5-10K', '10-15K', '15-20K', '20-30K', '30-50K', '50K+']
    df_salary['salary_range'] = pd.cut(df_salary['salary_avg'], bins=bins, labels=labels)
    
    distribution = df_salary['salary_range'].value_counts().sort_index()
    for range_label, count in distribution.items():
        salary_data["distribution"].append({
            "range": str(range_label),
            "count": int(count)
        })
    
    output_file = PROCESSED_DATA_PATH / "salary_analysis.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(salary_data, f, ensure_ascii=False, indent=2)
    
    print(f"   已保存薪资分析数据")
    return salary_data


def aggregate_education_experience(df):
    """学历-经验交叉分析"""
    print("\n聚合学历-经验交叉数据...")
    
    # 过滤有效数据
    df_valid = df[(df['education_level'] >= 0) & (df['experience_level'] >= 0) & 
                  (df['salary_avg'].notna())].copy()
    
    cross_data = []
    for edu in sorted(df_valid['education_level'].unique()):
        for exp in sorted(df_valid['experience_level'].unique()):
            subset = df_valid[(df_valid['education_level'] == edu) & 
                             (df_valid['experience_level'] == exp)]
            if len(subset) > 0:
                cross_data.append({
                    "education": int(edu),
                    "experience": int(exp),
                    "count": int(len(subset)),
                    "salary_mean": float(subset['salary_avg'].mean()),
                    "salary_median": float(subset['salary_avg'].median())
                })
    
    output_file = PROCESSED_DATA_PATH / "education_experience.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cross_data, f, ensure_ascii=False, indent=2)
    
    print(f"   已保存 {len(cross_data)} 条交叉分析数据")
    return cross_data


def aggregate_top_rankings(df):
    """TOP排名数据"""
    print("\n聚合TOP排名数据...")
    
    rankings = {
        "top_cities": [],
        "top_companies": [],
        "top_jobs": [],
        "top_industries": []
    }
    
    # TOP城市（按招聘数量）
    city_counts = df['city'].value_counts().head(20)
    for city, count in city_counts.items():
        city_data = df[df['city'] == city]
        rankings["top_cities"].append({
            "name": city,
            "count": int(count),
            "avg_salary": float(city_data['salary_avg'].mean()) if city_data['salary_avg'].notna().any() else None
        })
    
    # TOP企业（按招聘数量）
    company_counts = df['company'].value_counts().head(50)
    for company, count in company_counts.items():
        company_data = df[df['company'] == company]
        rankings["top_companies"].append({
            "name": company,
            "count": int(count),
            "industry": str(company_data['companyType'].mode()[0]) if len(company_data['companyType'].mode()) > 0 else None,
            "avg_salary": float(company_data['salary_avg'].mean()) if company_data['salary_avg'].notna().any() else None
        })
    
    # TOP职位（按招聘数量）
    job_counts = df['JobTitle'].value_counts().head(50)
    for job, count in job_counts.items():
        job_data = df[df['JobTitle'] == job]
        rankings["top_jobs"].append({
            "name": job,
            "count": int(count),
            "avg_salary": float(job_data['salary_avg'].mean()) if job_data['salary_avg'].notna().any() else None
        })
    
    # TOP行业（按招聘数量）
    industry_counts = df['companyType'].value_counts().head(20)
    for industry, count in industry_counts.items():
        industry_data = df[df['companyType'] == industry]
        rankings["top_industries"].append({
            "name": industry,
            "count": int(count),
            "avg_salary": float(industry_data['salary_avg'].mean()) if industry_data['salary_avg'].notna().any() else None,
            "company_count": int(industry_data['company'].nunique())
        })
    
    output_file = PROCESSED_DATA_PATH / "top_rankings.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rankings, f, ensure_ascii=False, indent=2)
    
    print(f"   已保存TOP排名数据")
    return rankings


def main():
    """主函数"""
    print("=" * 60)
    print("开始数据聚合...")
    print("=" * 60)
    
    # 检查输入文件
    if not INPUT_FILE.exists():
        print(f"\n错误: 找不到清洗后的数据文件 {INPUT_FILE}")
        print("请先运行 data_cleaning.py 进行数据清洗")
        return
    
    # 读取清洗后的数据
    print(f"\n读取数据: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"数据shape: {df.shape}")
    
    # 执行各项聚合
    aggregate_city_statistics(df)
    aggregate_industry_statistics(df)
    aggregate_salary_analysis(df)
    aggregate_education_experience(df)
    aggregate_top_rankings(df)
    
    print("\n" + "=" * 60)
    print("数据聚合完成！")
    print("所有JSON文件已保存到:", PROCESSED_DATA_PATH)
    print("\n生成的文件:")
    print("  - data_summary.json (数据摘要)")
    print("  - city_statistics.json (城市统计)")
    print("  - industry_statistics.json (行业统计)")
    print("  - salary_analysis.json (薪资分析)")
    print("  - education_experience.json (学历-经验交叉)")
    print("  - top_rankings.json (TOP排名)")
    print("=" * 60)


if __name__ == "__main__":
    main()
